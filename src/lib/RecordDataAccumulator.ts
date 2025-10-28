/**
 * Data record (normalized to intercapped)
 */
export interface Record {
	ResultValue: string;
	CharacteristicName: string;
	MonitoringLocationID: string;
	MonitoringLocationName: string;
}

/**
 * Result data for a monitoring location
 */
export interface LocationResult {
	average: number;
}

/**
 * When we parse long CSVs, a particular location may have thousands, or millions of
 * records. Rather than store all of them in one long array, instead, store the count of
 * how often we've seen each observation. Most observations will cluster around a few
 * values anyway.
 *
 * For instance, if it was 12.3° four times, we have {12300 -> 4}
 */
type ResultHistogram = Map<number, number>;

enum CharacteristicName {
	TEMPERATURE_WATER = 'Temperature, water'
}

/**
 * Map of lowercase 'characteristic names' to their intercapped canonical form
 */
const CHARACTERISTIC_NAME_MAP = new Map<string, CharacteristicName>(
	Object.values(CharacteristicName).map((val) => [val.toLowerCase(), val as CharacteristicName])
);

export class RecordDataAccumulator {
	private locationData: Map<string, ResultHistogram>;
	private locations: Map<string, string>;

	constructor() {
		this.locationData = new Map<string, ResultHistogram>();
		this.locations = new Map<string, string>();
	}

	getLocationData() {
		return this.locationData;
	}

	getLocations() {
		return this.locations;
	}

	/**
	 * Accumulates data in a space-efficient form for later processing
	 * @param record: CSVRecord
	 * @returns
	 */
	add(record: Record): void {
		// Filter for water temperature records
		const characteristicName = CHARACTERISTIC_NAME_MAP.get(record.CharacteristicName.toLowerCase());
		if (characteristicName === CharacteristicName.TEMPERATURE_WATER) {
			const locationId = record.MonitoringLocationID;
			const locationName = record.MonitoringLocationName;
			const resultValue = parseFloat(record.ResultValue);

			// Skip invalid numeric values
			if (isNaN(resultValue)) {
				return;
			}

			// Track location name
			if (!this.locations.has(locationId)) {
				this.locations.set(locationId, locationName);
			}

			// Add result value into the histogram for this location
			if (!this.locationData.has(locationId)) {
				this.locationData.set(locationId, new Map<number, number>());
			}

			// The result value is stored and parsed as a float, but here we multiply by 1000 to enter
			// an integer realm. For the moment this does little because JavaScript numbers are
			// always 64 bit floating point anyway, but this opens the door to more accurate
			// calculations later
			const resultValueMillis = Math.floor(resultValue * 1000);
			const locationValueCount = this.locationData.get(locationId)!.get(resultValueMillis) ?? 0;
			this.locationData.get(locationId)?.set(resultValueMillis, locationValueCount + 1);
		}
	}

	/**
	 * After we have accumulated data, call this to get a map of location ids -> LocationResult (e.g. average data)
	 * @returns Map<string, LocationResult>
	 */
	getLocationResults(): Map<string, LocationResult> {
		const results = new Map<string, LocationResult>();
		let locationToSumMillisAndCount = new Map<string, { sumMillis: number; count: number }>();
		for (const [locationId, histogram] of this.locationData) {
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
			results.set(locationId, {
				average: sumMillis / 1000 / count
			});
			overallSumMillis += sumMillis;
			overallCount += count;
		}

		// Set average for all locations
		if (overallCount > 0) {
			const overallAverage = overallSumMillis / 1000 / overallCount;
			results.set('-ALL-', {
				average: overallAverage
			});
		}
		return results;
	}
}
