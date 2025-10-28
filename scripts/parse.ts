#!/usr/bin/env ts-node

import { parseCSV } from '../src/lib/CsvParserNode.js';

async function main() {
	const filePath = process.argv[2];

	if (!filePath) {
		console.error('Usage: npm run parse -- <csv-file-path>');
		process.exit(1);
	}

	try {
		console.log(`Parsing CSV file: ${filePath}\n`);

		const results = await parseCSV(filePath);

		console.log('=== Monitoring Locations ===');
		console.log(`Found ${results.monitoringLocations.size} monitoring locations:\n`);
		for (const [id, name] of results.monitoringLocations) {
			console.log(`  ${id}: ${name}`);
		}

		console.log('\n=== Water Temperature Results ===\n');
		for (const [locationId, result] of results.monitoringLocationResults) {
			const locationName =
				locationId === '-ALL-' ? 'ALL LOCATIONS' : results.monitoringLocations.get(locationId);

			console.log(`${locationName} (${locationId}):`);
			console.log(`  Average: ${result.average.toFixed(2)}°C`);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Error: ${error.message}`);
		} else {
			console.error('An unexpected error occurred:', error);
		}
		process.exit(1);
	}
}

main();
