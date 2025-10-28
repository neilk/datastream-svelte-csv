/**
 * Web Worker for CSV parsing
 * Runs CSV parsing on a separate thread to avoid blocking the main UI thread
 */

import { parse } from 'csv-parse/browser/esm';
import { getParser, type ParseResults } from './CsvParser.js';
import type {
	WorkerRequestMessage,
	WorkerResponseMessage,
	SerializableParseResults
} from './workerTypes.js';

/**
 * Convert ParseResults (with Maps) to SerializableParseResults (with arrays)
 */
function serializeResults(results: ParseResults): SerializableParseResults {
	return {
		monitoringLocations: Array.from(results.monitoringLocations.entries()),
		monitoringLocationResults: Array.from(results.monitoringLocationResults.entries())
	};
}

/**
 * Parse CSV data from ArrayBuffer
 */
function parseCsvData(fileData: ArrayBuffer): Promise<ParseResults> {
	return new Promise<ParseResults>((resolve, reject) => {
		const errorCallback = (error: Error) => {
			reject(error);
		};

		const endCallback = (results: ParseResults) => {
			resolve(results);
		};

		const parser = getParser(parse, errorCallback, endCallback);

		// Convert ArrayBuffer to text and feed to parser
		const decoder = new TextDecoder();
		const text = decoder.decode(fileData);

		// Write all data at once (it's already in memory from the ArrayBuffer)
		parser.write(text);
		parser.end();
	});
}

/**
 * Handle messages from the main thread
 */
self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
	const { type, fileData } = event.data;

	if (type === 'parse') {
		try {
			// Parse the CSV data
			const results = await parseCsvData(fileData);

			// Serialize Maps to arrays for JSON transfer
			const serializedResults = serializeResults(results);

			// Send success message back to main thread
			const response: WorkerResponseMessage = {
				type: 'success',
				results: serializedResults
			};
			self.postMessage(response);
		} catch (error) {
			// Send error message back to main thread
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			const response: WorkerResponseMessage = {
				type: 'error',
				error: errorMessage
			};
			self.postMessage(response);
		}
	}
};
