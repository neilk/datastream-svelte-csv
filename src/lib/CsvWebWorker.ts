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
 * Handle messages from the main thread for streaming CSV parsing
 */
self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
	const message = event.data;

	try {
		if (message.type === 'file') {
			// Get the file and create a stream from it
			const file = message.file;
			const stream = file.stream();
			const reader = stream.getReader();
			const decoder = new TextDecoder();

			// Create a promise that will resolve when parsing is complete
			const parsePromise = new Promise<ParseResults>((resolve, reject) => {
				const parser = getParser(parse, resolve, reject);

				// Stream the file data to the parser
				async function readAndParse() {
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;

							// Decode the chunk and write to parser
							const text = decoder.decode(value, { stream: true });
							parser.write(text);
						}
						// Signal end of stream
						parser.end();
					} catch (error) {
						reject(error instanceof Error ? error : new Error('Stream reading error'));
					}
				}

				// Start reading (fire and forget)
				readAndParse();
			});

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
		}
	} catch (error) {
		// Send error message back to main thread
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		const response: WorkerResponseMessage = {
			type: 'error',
			error: errorMessage
		};
		self.postMessage(response);
	}
};
