import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

/**
 * Results from parsing a CSV file
 */
export interface ParseResults {
	monitoringLocations: Map<string, string>; // ID -> Name
	monitoringLocationResults: Map<string, LocationResult>; // ID -> Result
}

/**
 * Result data for a monitoring location
 */
export interface LocationResult {
	average: number;
	count: number;
}

/**
 * Parsed CSV record (normalized to intercapped)
 */
interface CSVRecord {
	ResultValue: string;
	CharacteristicName: string;
	MonitoringLocationID: string;
	MonitoringLocationName: string;
}

/**
 * Map of lowercase column names to their intercapped canonical form
 */
const COLUMN_NAME_MAP = new Map<string, string>([
	['resultvalue', 'ResultValue'],
	['characteristicname', 'CharacteristicName'],
	['monitoringlocationid', 'MonitoringLocationID'],
	['monitoringlocationname', 'MonitoringLocationName']
]);

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
 * Validates that required columns exist in the CSV header
 */
function validateHeaders(headers: string[]): void {
	const normalizedHeaders = headers.map((h) => h.toLowerCase());

	for (const requiredLowercase of COLUMN_NAME_MAP.keys()) {
		if (!normalizedHeaders.includes(requiredLowercase)) {
			const canonicalName = COLUMN_NAME_MAP.get(requiredLowercase);
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
		return COLUMN_NAME_MAP.get(lowercase) || header;
	});
}

/**
 * Parses a CSV file and extracts water temperature data by monitoring location
 */
export async function parseCSV(filePath: string): Promise<ParseResults> {
	const monitoringLocations = new Map<string, string>();
	const monitoringLocationData = new Map<string, number[]>();
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

	// Process each record as it's parsed
	parser.on('readable', function () {
		let record: CSVRecord;
		while ((record = parser.read()) !== null) {
			// Filter for water temperature records
			if (record.CharacteristicName.toLowerCase() === 'temperature, water') {
				const locationId = record.MonitoringLocationID;
				const locationName = record.MonitoringLocationName;
				const resultValue = parseFloat(record.ResultValue);

				// Skip invalid numeric values
				if (isNaN(resultValue)) {
					continue;
				}

				// Track location name
				if (!monitoringLocations.has(locationId)) {
					monitoringLocations.set(locationId, locationName);
				}

				// Collect result value
				if (!monitoringLocationData.has(locationId)) {
					monitoringLocationData.set(locationId, []);
				}
				monitoringLocationData.get(locationId)!.push(resultValue);
			}
		}
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

	// Calculate results
	const monitoringLocationResults = new Map<string, LocationResult>();
	let totalSum = 0;
	let totalCount = 0;

	for (const [locationId, values] of monitoringLocationData) {
		const count = values.length;
		const sum = values.reduce((acc, val) => acc + val, 0);
		const average = sum / count;

		monitoringLocationResults.set(locationId, { average, count });

		totalSum += sum;
		totalCount += count;
	}

	// Add weighted average for all locations
	if (totalCount > 0) {
		const overallAverage = totalSum / totalCount;
		monitoringLocationResults.set('-ALL-', {
			average: overallAverage,
			count: totalCount
		});
	}

	return {
		monitoringLocations,
		monitoringLocationResults
	};
}
