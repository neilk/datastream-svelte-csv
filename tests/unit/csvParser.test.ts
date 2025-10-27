import { describe, it, expect } from '@jest/globals';
import { parseCSV } from '../../src/lib/csvParser';
import type { ParseResults } from '../../src/lib/csvParser';
import { resolve } from 'path';

describe('CSV Parser', () => {
	let results: ParseResults;

	beforeAll(async function () {
		const sampleCsvPath = resolve(__dirname, '../../tests/data/sample.csv');
		results = await parseCSV(sampleCsvPath);
	});

	it('should calculate correct average for all locations (-ALL-)', () => {
		const allResult = results.monitoringLocationResults.get('-ALL-');
		expect(allResult).toBeDefined();
		expect(allResult?.average).toBeCloseTo(16.258);
	});

	it('should calculate correct average and count for a location', () => {
		const locationResult = results.monitoringLocationResults.get('RivTemp-Qc-16-100');
		expect(locationResult).toBeDefined();
		expect(locationResult?.average).toBeCloseTo(16.32);
		expect(locationResult?.count).toBe(3);
	});

	it('should track monitoring location names', () => {
		const locationName = results.monitoringLocations.get('RivTemp-Qc-16-100');
		expect(locationName).toBe('Morin P - Riv. Ste-Marguerite (Saguenay)');
	});

	it('should filter for water temperature records only', () => {
		// All results should have counts and averages
		results.monitoringLocationResults.forEach((result, locationId) => {
			expect(result.count).toBeGreaterThan(0);
			expect(result.average).toBeGreaterThan(0);
			expect(typeof locationId).toBe('string');
			expect(typeof result.average).toBe('number');
		});
	});
});
