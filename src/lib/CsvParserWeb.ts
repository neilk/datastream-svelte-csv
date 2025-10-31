import type { ParseResults } from './CsvParser.js';

// Re-export ParseResults for convenience
export type { ParseResults } from './CsvParser.js';
import type {
	WorkerRequestMessage,
	WorkerResponseMessage,
	SerializableParseResults
} from './WorkerTypes.js';

/**
 * Error thrown when CSV parsing is cancelled
 */
export class CancellationError extends Error {
	constructor(message = 'CSV parsing was cancelled') {
		super(message);
		this.name = 'CancellationError';
	}
}

/**
 * Result of parseCsv, containing both the promise and a cancel function
 */
export interface CsvParseOperation {
	promise: Promise<ParseResults>;
	cancel: () => void;
}

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
 * @returns An object containing a promise for the results and a cancel function
 */
export function parseCsv(file: File): CsvParseOperation {
	let worker: Worker | null = null;
	let isCancelled = false;

	const promise = new Promise<ParseResults>((resolve, reject) => {
		// Create worker from the worker module
		// Vite will handle bundling the worker correctly with ?worker suffix
		worker = new Worker(new URL('./CsvWebWorker.ts', import.meta.url), {
			type: 'module'
		});

		// Handle messages from the worker
		worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
			const message = event.data;

			if (message.type === 'success') {
				// Deserialize the results (convert arrays back to Maps)
				const results = deserializeResults(message.results);
				if (worker) {
					worker.terminate();
					worker = null;
				}
				resolve(results);
			} else if (message.type === 'error') {
				if (worker) {
					worker.terminate();
					worker = null;
				}
				reject(new Error(message.error));
			} else if (message.type === 'cancelled') {
				if (worker) {
					worker.terminate();
					worker = null;
				}
				reject(new CancellationError());
			}
		};

		// Handle worker errors
		worker.onerror = (error) => {
			if (worker) {
				worker.terminate();
				worker = null;
			}
			reject(new Error(`Worker error: ${error.message}`));
		};

		// Send the file to the worker
		const fileMessage: WorkerRequestMessage = {
			type: 'file',
			file: file
		};
		worker.postMessage(fileMessage);
	});

	const cancel = async () => {
		console.log('received cancel');
		if (isCancelled || !worker) {
			return; // Already cancelled or worker doesn't exist
		}

		// Send cancel message to worker (best effort)
		try {
			const cancelMessage: WorkerRequestMessage = {
				type: 'cancel'
			};
			worker.postMessage(cancelMessage);
		} catch (error) {
			// Worker might already be terminated, ignore
		} finally {
			// Terminate the worker immediately
			worker.terminate();
			worker = null;
		}

		isCancelled = true;
	};

	return { promise, cancel };
}
