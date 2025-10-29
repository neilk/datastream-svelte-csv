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

			// Create a promise that will resolve when parsing is complete
			const parsePromise = new Promise<ParseResults>((resolve, reject) => {
				const parser = getParser(parse, resolve, reject);
				const decoder = new TextDecoder();

				// Create a WritableStream that writes to the parser
				const writable = new WritableStream({
					write(chunk: Uint8Array) {
						const text = decoder.decode(chunk, { stream: true });
						parser.write(text);
					},
					close() {
						parser.end();
					},
					abort(err) {
						reject(err);
					}
				});

				// Pipe the file stream to the parser (similar to Node's pipeline)
				stream.pipeTo(writable).catch(reject);
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
