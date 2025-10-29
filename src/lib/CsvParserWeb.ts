import type { ParseResults } from './CsvParser.js';

// Re-export ParseResults for convenience
export type { ParseResults } from './CsvParser.js';
import type {
	WorkerRequestMessage,
	WorkerResponseMessage,
	SerializableParseResults
} from './WorkerTypes.js';

/**
 * Convert SerializableParseResults (with arrays) back to ParseResults (with Maps)
 */
function deserializeResults(serialized: SerializableParseResults): ParseResults {
	return {
		monitoringLocations: new Map(serialized.monitoringLocations),
		monitoringLocationResults: new Map(serialized.monitoringLocationResults)
	};
}

/**
 * Parses CSV data from a Web ReadableStream (browser-compatible) using true streaming.
 *
 * Chunks are sent to a Web Worker as they arrive, avoiding loading the entire file into memory.
 * This allows processing of large multi-megabyte CSV files without blocking the UI or
 * consuming excessive memory.
 *
 * @param webStream - A Web ReadableStream containing CSV data (e.g., from File.stream())
 * @returns Parse results containing monitoring locations and their statistics
 */
export async function parseCsv(webStream: ReadableStream): Promise<ParseResults> {
	return new Promise<ParseResults>(async (resolve, reject) => {
		// Create worker from the worker module
		// Vite will handle bundling the worker correctly with ?worker suffix
		const worker = new Worker(new URL('./CsvWebWorker.ts', import.meta.url), {
			type: 'module'
		});

		// Handle messages from the worker
		worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
			const message = event.data;

			if (message.type === 'success') {
				// Deserialize the results (convert arrays back to Maps)
				const results = deserializeResults(message.results);
				worker.terminate();
				resolve(results);
			} else if (message.type === 'error') {
				worker.terminate();
				reject(new Error(message.error));
			}
		};

		// Handle worker errors
		worker.onerror = (error) => {
			worker.terminate();
			reject(new Error(`Worker error: ${error.message}`));
		};

		try {
			// Send start message to initialize the parser
			const startMessage: WorkerRequestMessage = { type: 'start' };
			worker.postMessage(startMessage);

			// Stream chunks to the worker as they arrive
			const reader = webStream.getReader();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					// Send chunk to worker (transfer the buffer for efficiency)
					const chunkMessage: WorkerRequestMessage = {
						type: 'chunk',
						data: value.buffer
					};
					worker.postMessage(chunkMessage, [value.buffer]);
				}
			} finally {
				reader.releaseLock();
			}

			// Send end message to signal completion
			const endMessage: WorkerRequestMessage = { type: 'end' };
			worker.postMessage(endMessage);
		} catch (error) {
			worker.terminate();
			reject(error);
		}
	});
}
