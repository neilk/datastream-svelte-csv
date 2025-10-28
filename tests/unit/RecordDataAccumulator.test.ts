import { describe, it, expect } from '@jest/globals';
import type { Record } from '../../src/lib/RecordDataAccumulator.js';
import { RecordDataAccumulator } from '../../src/lib/RecordDataAccumulator.js';

describe('RecordDataAccumulator', () => {
	it('should accumulate monitoring locations', () => {
		const accumulator = new RecordDataAccumulator();

		const record1: Record = {
			ResultValue: '15.5',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location 1'
		};

		const record2: Record = {
			ResultValue: '16.5',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-002',
			MonitoringLocationName: 'Test Location 2'
		};

		accumulator.add(record1);
		accumulator.add(record2);

		const locations = accumulator.getLocations();
		expect(locations.size).toBe(2);
		expect(locations.get('LOC-001')).toBe('Test Location 1');
		expect(locations.get('LOC-002')).toBe('Test Location 2');
	});

	it('should calculate correct averages for single location', () => {
		const accumulator = new RecordDataAccumulator();

		accumulator.add({
			ResultValue: '10.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		accumulator.add({
			ResultValue: '20.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		const results = accumulator.getLocationResults();
		const loc001Result = results.get('LOC-001');

		expect(loc001Result).toBeDefined();
		expect(loc001Result?.average).toBe(15.0);
	});

	it('should calculate correct -ALL- average across multiple locations', () => {
		const accumulator = new RecordDataAccumulator();

		accumulator.add({
			ResultValue: '10.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Location 1'
		});

		accumulator.add({
			ResultValue: '20.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-002',
			MonitoringLocationName: 'Location 2'
		});

		accumulator.add({
			ResultValue: '30.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-003',
			MonitoringLocationName: 'Location 3'
		});

		const results = accumulator.getLocationResults();
		const allResult = results.get('-ALL-');

		expect(allResult).toBeDefined();
		expect(allResult?.average).toBe(20.0); // (10 + 20 + 30) / 3
	});

	it('should filter out non-water-temperature records', () => {
		const accumulator = new RecordDataAccumulator();

		accumulator.add({
			ResultValue: '15.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		accumulator.add({
			ResultValue: '7.5',
			CharacteristicName: 'pH',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		const results = accumulator.getLocationResults();
		const loc001Result = results.get('LOC-001');

		expect(loc001Result?.average).toBe(15.0);
	});

	it('should handle case-insensitive characteristic names', () => {
		const accumulator = new RecordDataAccumulator();

		accumulator.add({
			ResultValue: '15.0',
			CharacteristicName: 'TEMPERATURE, WATER',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		accumulator.add({
			ResultValue: '25.0',
			CharacteristicName: 'temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		const results = accumulator.getLocationResults();
		const loc001Result = results.get('LOC-001');

		expect(loc001Result?.average).toBe(20.0);
	});

	it('should skip invalid numeric values', () => {
		const accumulator = new RecordDataAccumulator();

		accumulator.add({
			ResultValue: '15.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		accumulator.add({
			ResultValue: 'invalid',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		accumulator.add({
			ResultValue: '25.0',
			CharacteristicName: 'Temperature, water',
			MonitoringLocationID: 'LOC-001',
			MonitoringLocationName: 'Test Location'
		});

		const results = accumulator.getLocationResults();
		const loc001Result = results.get('LOC-001');

		expect(loc001Result?.average).toBe(20.0); // Should only average 15.0 and 25.0
	});

	it('should handle duplicate temperature values efficiently', () => {
		const accumulator = new RecordDataAccumulator();

		// Add the same temperature multiple times
		for (let i = 0; i < 5; i++) {
			accumulator.add({
				ResultValue: '15.5',
				CharacteristicName: 'Temperature, water',
				MonitoringLocationID: 'LOC-001',
				MonitoringLocationName: 'Test Location'
			});
		}

		const results = accumulator.getLocationResults();
		const loc001Result = results.get('LOC-001');

		expect(loc001Result?.average).toBe(15.5);

		// Verify the histogram structure is efficient (should only have one entry)
		const locationData = accumulator.getLocationData().get('LOC-001');
		expect(locationData?.size).toBe(1); // Only one unique value in histogram
		expect(locationData?.get(15500)).toBe(5); // Count of 5 for that value
	});
});
