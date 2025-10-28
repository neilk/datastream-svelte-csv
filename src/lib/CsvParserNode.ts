/**
 * Node.js-specific CSV parsing functions
 * This file should only be imported in Node.js environments (tests, CLI scripts)
 */

import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { Record, LocationResult } from './RecordDataAccumulator.js';
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
 * Parses a CSV file from the file system (Node.js only).
 * Extracts averages of water temperature data by monitoring location.
 *
 * @param filePath - Path to the CSV file to parse
 * @returns Parse results containing monitoring locations and their statistics
 */
export async function parseCsv(filePath: string): Promise<ParseResults> {
	let headersValidated = false;

	const parser = parse({
		columns: (headers) => {
			// Validate headers on first row
			validateHeaders(headers);
			headersValidated = true;

			// Normalize column names to intercapped form
			return normalizeHeaders(headers);
		},
		skip_empty_lines: true,
		trim: true
	});

	// Process each record as it is parsed
	const accumulator = new RecordDataAccumulator();
	parser.on('readable', function () {
		let record: Record;
		while ((record = parser.read()) !== null) {
			accumulator.add(record);
		}
	});

	// Handle parser errors explicitly
	parser.on('error', (error) => {
		stream.destroy();
		throw error;
	});

	// Stream the file through the parser
	const stream = createReadStream(filePath);

	try {
		await pipeline(stream, parser);
	} catch (error) {
		if (!headersValidated) {
			throw new Error('CSV file must have a header line');
		}
		throw error;
	}

	return {
		monitoringLocations: accumulator.getLocations(),
		monitoringLocationResults: accumulator.getLocationResults()
	};
}
