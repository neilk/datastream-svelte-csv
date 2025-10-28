import { parse } from 'csv-parse/browser/esm';
import { type ParseResults, getParser } from './CsvParser.js';

/**
 * Parses CSV data from a Web ReadableStream (browser-compatible).
 * Extracts averages of water temperature data by monitoring location.
 *
 * @param webStream - A Web ReadableStream containing CSV data (e.g., from File.stream())
 * @returns Parse results containing monitoring locations and their statistics
 */
export async function parseCsv(webStream: ReadableStream): Promise<ParseResults> {
	// Create promises for completion and error handling
	return new Promise<ParseResults>((resolve, reject) => {
		const errorCallback = (error: Error) => {
			reject(error);
		};

		const endCallback = (results: ParseResults) => {
			resolve(results);
		};

		const parser = getParser(parse, errorCallback, endCallback);

		// Pipeline Web ReadableStream to parser
		const decoder = new TextDecoder();
		const writableStream = new WritableStream({
			write(chunk) {
				const text = decoder.decode(chunk, { stream: false });
				parser.write(text);
			},
			close() {
				parser.end();
			}
		});

		// pipeTo returns a Promise - catch any streaming errors
		webStream.pipeTo(writableStream).catch(reject);
	});
}
