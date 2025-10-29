/**
 * Web Worker for CSV parsing
 * Runs CSV parsing on a separate thread to avoid blocking the main UI thread
 * Uses streaming approach to handle large files without loading everything into memory
 */

import { parse } from 'csv-parse/browser/esm';
import { getParser, type ParseResults } from './CsvParser.js';
import type {
	WorkerRequestMessage,
	WorkerResponseMessage,
	SerializableParseResults
} from './WorkerTypes.js';
import type { Parser } from 'csv-parse';

/**
 * Convert ParseResults (with Maps) to SerializableParseResults (with arrays)
 */
function serializeResults(results: ParseResults): SerializableParseResults {
	return {
		monitoringLocations: Array.from(results.monitoringLocations.entries()),
		monitoringLocationResults: Array.from(results.monitoringLocationResults.entries())
	};
}

// Worker state for streaming parsing
let currentParser: Parser | null = null;
let decoder: TextDecoder | null = null;
let parsePromise: Promise<ParseResults> | null = null;

/**
 * Handle messages from the main thread for streaming CSV parsing
 */
self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
	const message = event.data;

	try {
		if (message.type === 'start') {
			// Initialize parser and decoder for streaming
			decoder = new TextDecoder();

			// Create promise that will resolve when parsing is complete
			parsePromise = new Promise<ParseResults>((resolve, reject) => {
				const errorCallback = (error: Error) => {
					reject(error);
				};

				const endCallback = (results: ParseResults) => {
					resolve(results);
				};

				currentParser = getParser(parse, errorCallback, endCallback);
			});
		} else if (message.type === 'chunk') {
			// Process a chunk of data
			if (!currentParser || !decoder) {
				throw new Error('Parser not initialized. Send "start" message first.');
			}

			// Decode the chunk and write to parser
			const text = decoder.decode(message.data, { stream: true });
			currentParser.write(text);
		} else if (message.type === 'end') {
			// Signal end of stream and wait for results
			if (!currentParser || !parsePromise) {
				throw new Error('Parser not initialized. Send "start" message first.');
			}

			// End the parser - this will trigger the endCallback
			currentParser.end();

			// Wait for parsing to complete
			const results = await parsePromise;

			// Serialize Maps to arrays for JSON transfer
			const serializedResults = serializeResults(results);

			// Send success message back to main thread
			const response: WorkerResponseMessage = {
				type: 'success',
				results: serializedResults
			};
			self.postMessage(response);

			// Clean up
			currentParser = null;
			decoder = null;
			parsePromise = null;
		}
	} catch (error) {
		// Send error message back to main thread
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		const response: WorkerResponseMessage = {
			type: 'error',
			error: errorMessage
		};
		self.postMessage(response);

		// Clean up on error
		currentParser = null;
		decoder = null;
		parsePromise = null;
	}
};
