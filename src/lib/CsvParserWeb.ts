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
 * Parses CSV data from a File object using true streaming in a Web Worker.
 *
 * The File object is transferred to the worker, which creates a stream and processes it.
 * This allows processing of large multi-megabyte CSV files without blocking the UI or
 * consuming excessive memory.
 *
 * @param file - A File object containing CSV data
 * @returns Parse results containing monitoring locations and their statistics
 */
export async function parseCsv(file: File): Promise<ParseResults> {
	return new Promise<ParseResults>((resolve, reject) => {
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

		// Send the file to the worker
		const fileMessage: WorkerRequestMessage = {
			type: 'file',
			file: file
		};
		worker.postMessage(fileMessage);
	});
}
