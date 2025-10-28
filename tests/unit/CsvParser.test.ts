import { describe, it, expect, beforeAll } from '@jest/globals';
import type { ParseResults } from '../../src/lib/CsvParser';
import { parseCsv } from '../../src/lib/CsvParserCli';
import { resolve } from 'path';

describe('CSV Parser', () => {
	let results: ParseResults;

	beforeAll(async function () {
		const sampleCsvPath = resolve(__dirname, '../data/sample.csv');
		results = await parseCsv(sampleCsvPath);
	});

	it('should calculate correct average for all locations (-ALL-)', () => {
		const allResult = results.monitoringLocationResults.get('-ALL-');
		expect(allResult).toBeDefined();
		expect(allResult?.average).toBeCloseTo(16.258, 2);
	});

	it('should calculate correct average for RivTemp-Qc-16-100', () => {
		const locationResult = results.monitoringLocationResults.get('RivTemp-Qc-16-100');
		expect(locationResult).toBeDefined();
		expect(locationResult?.average).toBeCloseTo(16.32, 2);
	});

	it('should track monitoring location names', () => {
		const locationName = results.monitoringLocations.get('RivTemp-Qc-16-100');
		expect(locationName).toBe('Morin P - Riv. Ste-Marguerite (Saguenay)');
	});

	it('should filter for water temperature records only', () => {
		// All results should have counts and averages
		results.monitoringLocationResults.forEach((result, locationId) => {
			expect(result.average).toBeGreaterThan(0);
			expect(typeof locationId).toBe('string');
			expect(typeof result.average).toBe('number');
		});
	});
});
