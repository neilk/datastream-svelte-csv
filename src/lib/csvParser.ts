import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

enum CharacteristicName {
	TEMPERATURE_WATER = 'Temperature, water'
}

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
 * Map of lowercase 'characteristic names' to their intercapped canonical form
 */
const CHARACTERISTIC_NAME_MAP = new Map<string, CharacteristicName>(
	Object.values(CharacteristicName).map((val) => [val.toLowerCase(), val as CharacteristicName])
);

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
 * Parses a CSV file and extracts water temperature data by monitoring location
 */
export async function parseCSV(filePath: string): Promise<ParseResults> {
	// monitoring location id to name
	const monitoringLocations = new Map<string, string>();

	// monitoring location id to a histogram of values recorded
	const monitoringLocationData = new Map<string, Map<number, number>>();
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
			const characteristicName = CHARACTERISTIC_NAME_MAP.get(
				record.CharacteristicName.toLowerCase()
			);
			if (characteristicName === CharacteristicName.TEMPERATURE_WATER) {
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

				// Add result value into the histogram for this location
				if (!monitoringLocationData.has(locationId)) {
					monitoringLocationData.set(locationId, new Map<number, number>());
				}
				const resultValueMillis = Math.floor(resultValue * 1000);
				const locationValueCount =
					monitoringLocationData.get(locationId)!.get(resultValueMillis) ?? 0;
				monitoringLocationData.get(locationId)?.set(resultValueMillis, locationValueCount + 1);
			}
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

	// Calculate results

	const monitoringLocationResults = new Map<string, LocationResult>();
	let locationToSumMillisAndCount = new Map<string, { sumMillis: number; count: number }>();
	for (const [locationId, histogram] of monitoringLocationData) {
		let locationSumMillis = 0;
		let locationCount = 0;
		for (const [millis, count] of histogram) {
			locationSumMillis += millis * count;
			locationCount += count;
		}
		locationToSumMillisAndCount.set(locationId, {
			sumMillis: locationSumMillis,
			count: locationCount
		});
	}

	// Set averages for each location
	let overallSumMillis = 0;
	let overallCount = 0;
	for (const [locationId, { sumMillis, count }] of locationToSumMillisAndCount) {
		monitoringLocationResults.set(locationId, {
			average: sumMillis / 1000 / count,
			count: count
		});
		overallSumMillis += sumMillis;
		overallCount += count;
	}

	// Set average for all locations
	if (overallCount > 0) {
		const overallAverage = overallSumMillis / 1000 / overallCount;
		monitoringLocationResults.set('-ALL-', {
			average: overallAverage,
			count: overallCount
		});
	}

	return {
		monitoringLocations,
		monitoringLocationResults
	};
}
