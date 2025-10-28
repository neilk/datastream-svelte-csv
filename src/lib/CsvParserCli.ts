/**
 * Node.js-specific CSV parsing functions
 * This file should only be imported in Node.js environments (tests, CLI scripts)
 */

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { type ParseResults, getParser } from './CsvParserCommon.js';

/**
 * Parses a CSV file from the file system (Node.js only).
 * Extracts averages of water temperature data by monitoring location.
 *
 * @param filePath - Path to the CSV file to parse
 * @returns Parse results containing monitoring locations and their statistics
 */
export async function parseCsv(filePath: string): Promise<ParseResults> {
	const stream = createReadStream(filePath);
	return new Promise<ParseResults>(async (resolve, reject) => {
		const errorCallback = (error: Error) => {
			stream.destroy();
			reject(error);
		};

		const endCallback = (results: ParseResults) => {
			resolve(results);
		};

		const parser = getParser(parse, errorCallback, endCallback);

		await pipeline(stream, parser);
	});
}
