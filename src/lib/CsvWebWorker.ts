/**
 * Web Worker for CSV parsing
 * Runs CSV parsing on a separate thread to avoid blocking the main UI thread
 * Uses streaming approach to handle large files without loading everything into memory
 */

import { parse } from 'csv-parse/browser/esm';
import type { Parser } from 'csv-parse';
import { getParser, type ParseResults } from './CsvParser.js';
import type {
	WorkerRequestMessage,
	WorkerResponseMessage,
	SerializableParseResults,
	WorkerFileMessage,
	WorkerErrorMessage
} from './WorkerTypes.js';

/**
 * Store current parser for cancellation
 */
let currentParser: Parser | null = null;

/**
 * Track cancellation state to prevent race conditions
 */
let isCancelled = false;

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
self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
	const message = event.data;

	if (message.type === 'file') {
		// Reset cancellation state for new file
		isCancelled = false;

		// Get the file and create a stream from it
		const file = message.file;
		const stream = file.stream();

		// Process the file using promise chains to avoid async handler
		startProcessing(stream)
			.then((results) => {
				// Only send success if not cancelled
				if (!isCancelled) {
					// Serialize Maps to arrays for JSON transfer
					const serializedResults = serializeResults(results);

					// Send success message back to main thread
					const response: WorkerResponseMessage = {
						type: 'success',
						results: serializedResults
					};
					self.postMessage(response);
				}
			})
			.catch((error) => {
				// Only send error if not cancelled
				if (!isCancelled) {
					// Clear parser reference on error
					currentParser = null;

					// Send error message back to main thread
					const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
					const response: WorkerResponseMessage = {
						type: 'error',
						error: errorMessage
					};
					self.postMessage(response);
				}
			});
	} else if (message.type === 'cancel') {
		// Set cancellation flag to prevent further messages
		isCancelled = true;

		// Destroy the parser if it exists
		cancelProcessing();

		// Send cancelled acknowledgement
		const response: WorkerResponseMessage = {
			type: 'cancelled'
		};
		self.postMessage(response);
	} else {
		const response: WorkerErrorMessage = {
			type: 'error',
			error: 'unrecognized message'
		};
		self.postMessage(response);
	}
};

function cancelProcessing() {
	if (currentParser) {
		currentParser.destroy();
		currentParser = null;
	}
}

async function startProcessing(stream: ReadableStream) {
	// Create a promise that will resolve when parsing is complete
	const parsePromise = new Promise<ParseResults>((resolve, reject) => {
		const parser = getParser(parse, resolve, reject);
		currentParser = parser; // Store for potential cancellation
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

	// Clear parser reference
	currentParser = null;

	return results;
}
