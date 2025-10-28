import type { ParseResults } from './CsvParser.js';

// Re-export ParseResults for convenience
export type { ParseResults } from './CsvParser.js';
import type {
	WorkerRequestMessage,
	WorkerResponseMessage,
	SerializableParseResults
} from './workerTypes.js';

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
 * Parses CSV data from a Web ReadableStream (browser-compatible).
 * Uses a Web Worker to parse data on a separate thread, preventing UI freezing.
 * Extracts averages of water temperature data by monitoring location.
 *
 * @param webStream - A Web ReadableStream containing CSV data (e.g., from File.stream())
 * @returns Parse results containing monitoring locations and their statistics
 */
export async function parseCsv(webStream: ReadableStream): Promise<ParseResults> {
	// First, read the entire stream into an ArrayBuffer
	// This is necessary because we need to transfer the data to the worker
	const chunks: Uint8Array[] = [];
	const reader = webStream.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	// Combine all chunks into a single ArrayBuffer
	const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const combined = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}

	// Create and communicate with the worker
	return new Promise<ParseResults>((resolve, reject) => {
		// Create worker from the worker module
		// Vite will handle bundling the worker correctly with ?worker suffix
		const worker = new Worker(new URL('./csvWorker.ts', import.meta.url), {
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

		// Send the file data to the worker
		const request: WorkerRequestMessage = {
			type: 'parse',
			fileData: combined.buffer
		};
		worker.postMessage(request, [combined.buffer]); // Transfer the buffer
	});
}
