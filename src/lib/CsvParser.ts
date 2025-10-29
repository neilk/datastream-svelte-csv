/**
 * This is a common library containing the logic for processing CSV files.
 * We have two entry points for CSV processing - command-line and web - that use
 * slightly different abstractions for streaming data. But this library presents
 * a parser that uses the same logic in both.
 */

import type { Parser } from 'csv-parse';
import type { LocationResult, Record } from './RecordDataAccumulator.js';
import { RecordDataAccumulator } from './RecordDataAccumulator.js';

/**
 * Results from parsing a CSV file
 */
export interface ParseResults {
	monitoringLocations: Map<string, string>; // ID -> Name
	monitoringLocationResults: Map<string, LocationResult>; // ID -> Result
}

/**
 * Required columns (in their canonical intercapped form)
 */
const REQUIRED_COLUMNS = [
	'ResultValue',
	'CharacteristicName',
	'MonitoringLocationID',
	'MonitoringLocationName'
];

/**
 * Map of lowercase column names to their intercapped canonical form
 */
const REQUIRED_COLUMN_NAME_MAP = new Map<string, string>(
	REQUIRED_COLUMNS.map((val) => [val.toLowerCase(), val])
);

/**
 * Validates that required columns exist in the CSV header
 */
function validateHeaders(headers: string[]): void {
	const normalizedHeaders = headers.map((h) => h.toLowerCase());
	for (const requiredLowercase of REQUIRED_COLUMN_NAME_MAP.keys()) {
		if (!normalizedHeaders.includes(requiredLowercase)) {
			const canonicalName = REQUIRED_COLUMN_NAME_MAP.get(requiredLowercase);
			throw new Error(`Missing required column: ${canonicalName} (case-insensitive)`);
		}
	}
}

/**
 * Normalizes column headers to their canonical intercapped form
 */
function normalizeHeaders(headers: string[]): string[] {
	return headers.map((header) => {
		const lowercase = header.toLowerCase();
		return REQUIRED_COLUMN_NAME_MAP.get(lowercase) || header;
	});
}

/**
 * Our two entry points - CLI and web - will configure this parser to emit events that they
 * will then make use of in their own environments. The parser will usually make its own
 * "accumulator", though we leave the option open to provide a mock for unit testing.
 *
 * @param parse
 * @param errorCallback
 * @param endCallback
 * @param accumulator
 * @returns
 */
export function getParser(
	parse: Function,
	endCallback: (parseResults: ParseResults) => void,
	errorCallback: (error: Error) => void,
	accumulator: RecordDataAccumulator = new RecordDataAccumulator()
): Parser {
	const parser = parse({
		columns: (headers: string[]) => {
			// Validate headers on first row
			validateHeaders(headers);

			// Normalize column names to intercapped form
			return normalizeHeaders(headers);
		},
		skip_empty_lines: true,
		trim: true
	});

	parser.on('readable', function () {
		let record: Record;
		while ((record = parser.read()) !== null) {
			accumulator.add(record);
		}
	});

	parser.on('error', errorCallback);
	parser.on('end', () => {
		const results: ParseResults = {
			monitoringLocations: accumulator.getLocations(),
			monitoringLocationResults: accumulator.getLocationResults()
		};
		endCallback(results);
	});

	return parser;
}
