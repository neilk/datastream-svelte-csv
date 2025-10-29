#!/usr/bin/env ts-node

// Command-line utility to parse a CSV file and display results.
// This repository is mostly about creating a web app, so this is just for convenient testing of
// parsing logic.

import { parseCsv } from '../src/lib/CsvParserCli.js';

async function main(filePath: string): Promise<void> {
	console.log(`Parsing CSV file: ${filePath}\n`);
	const results = await parseCsv(filePath);

	console.log('=== Monitoring Locations ===');
	console.log(`Found ${results.monitoringLocations.size} monitoring locations:\n`);
	for (const id of Array.from(results.monitoringLocations.keys()).sort()) {
		console.log(`  ${id}: ${results.monitoringLocations.get(id)}`);
	}

	console.log('\n=== Water Temperature Results ===\n');
	for (const id of Array.from(results.monitoringLocationResults.keys()).sort()) {
		const result = results.monitoringLocationResults.get(id);
		const name = id === '-ALL-' ? 'ALL LOCATIONS' : results.monitoringLocations.get(id);

		console.log(`${id} (${name}):`);
		console.log(`  Average: ${result?.average.toFixed(2)}°C`);
	}
}

const filePath = process.argv[2];

if (!filePath) {
	console.error(`Usage: ${process.argv[0]} <csv-file-path>`);
	process.exit(1);
}

main(filePath).catch((error) => {
	throw error;
});
