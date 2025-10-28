<script lang="ts">
	/**
	 * Reusable Water Temperature Analyzer Component
	 *
	 * This component analyzes CSV files containing water temperature data
	 * and displays aggregate statistics by monitoring location.
	 *
	 * Can be dropped into any Svelte application.
	 */

	import { parseCSVFromStream, type ParseResults } from '$lib/CsvParserWeb';
	import type { LocationResult } from '$lib/RecordDataAccumulator';

	// Props for customization
	interface Props {
		title?: string;
	}

	const { title = 'Water Temperature Analysis' }: Props = $props();

	// State
	let selectedFile: File | null = $state(null);
	let isProcessing = $state(false);
	let errorMessage: string | null = $state(null);
	let parseResults: ParseResults | null = $state(null);
	let selectedLocationId: string = $state('-ALL-');
	let displayMode: 'id' | 'name' = $state('name');

	// Derived state
	let monitoringLocations = $derived(
		parseResults?.monitoringLocations || new Map<string, string>()
	);
	let sortedLocations = $derived.by(() => {
		const entries = [...monitoringLocations.entries()];
		return entries.sort((a, b) => {
			const aLabel = displayMode === 'id' ? a[0] : a[1];
			const bLabel = displayMode === 'id' ? b[0] : b[1];
			return aLabel.localeCompare(bLabel);
		});
	});
	let currentResult = $derived.by(() => {
		if (!parseResults) return null;
		return parseResults.monitoringLocationResults.get(selectedLocationId) || null;
	});

	/**
	 * Handle file input change event and process the file
	 */
	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] || null;

		if (!file) {
			selectedFile = null;
			parseResults = null;
			errorMessage = null;
			return;
		}

		selectedFile = file;
		errorMessage = null;
		isProcessing = true;

		try {
			// Get the file as a Web ReadableStream
			const stream = file.stream();

			// Parse the CSV file
			const results = await parseCSVFromStream(stream);

			// Update state with results
			parseResults = results;
			selectedLocationId = '-ALL-'; // Default to showing all locations
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			parseResults = null;
		} finally {
			isProcessing = false;
		}
	}

	/**
	 * Handle monitoring location selection change
	 */
	function handleLocationChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedLocationId = target.value;
	}
</script>

<div class="water-temp-analyzer">
	<h1>{title}</h1>

	<div class="file-input-section">
		<label for="csv-file-input">
			<strong>Select CSV File:</strong>
		</label>
		<input id="csv-file-input" type="file" accept=".csv" onchange={handleFileChange} />
	</div>

	{#if errorMessage}
		<div class="error-message">
			<p><strong>Error:</strong> {errorMessage}</p>
		</div>
	{/if}

	{#if isProcessing}
		<div class="processing-message">
			<p>Processing file: <strong>{selectedFile?.name}</strong></p>
			<p>Please wait...</p>
		</div>
	{/if}

	{#if parseResults && !isProcessing}
		<div class="results-section">
			<div class="location-selector">
				<label for="monitoring-location-select">
					<strong>Monitoring Location:</strong>
				</label>

				<div class="display-mode-selector">
					<label>
						<input type="radio" name="display-mode" value="name" bind:group={displayMode} />
						By Name
					</label>
					<label>
						<input type="radio" name="display-mode" value="id" bind:group={displayMode} />
						By ID
					</label>
				</div>

				<select
					id="monitoring-location-select"
					value={selectedLocationId}
					onchange={handleLocationChange}
				>
					<option value="-ALL-">All Locations (Average)</option>
					{#each sortedLocations as [id, name]}
						<option value={id}>{displayMode === 'id' ? id : name}</option>
					{/each}
				</select>
			</div>

			{#if currentResult}
				<div class="temperature-display">
					<h2>Average Water Temperature</h2>
					<div class="temperature-value">
						{currentResult.average.toFixed(2)}°C
					</div>
					<p class="temperature-metadata">
						Based on {currentResult.count} measurements
						{#if selectedLocationId !== '-ALL-'}
							at {monitoringLocations.get(selectedLocationId)}
						{/if}
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.water-temp-analyzer {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		color: #333;
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	h2 {
		color: #333;
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	p {
		color: #666;
		font-size: 1rem;
	}

	.file-input-section {
		margin: 2rem 0;
		padding: 1.5rem;
		border: 2px dashed #ccc;
		border-radius: 8px;
		background-color: #f9f9f9;
	}

	.file-input-section label {
		display: block;
		margin-bottom: 0.5rem;
		color: #333;
	}

	.file-input-section input[type='file'] {
		display: block;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		cursor: pointer;
	}

	.error-message {
		margin: 1.5rem 0;
		padding: 1rem;
		background-color: #ffebee;
		border-left: 4px solid #f44336;
		border-radius: 4px;
	}

	.error-message p {
		margin: 0;
		color: #c62828;
	}

	.processing-message {
		margin: 1.5rem 0;
		padding: 1rem;
		background-color: #e3f2fd;
		border-left: 4px solid #2196f3;
		border-radius: 4px;
	}

	.processing-message p {
		margin: 0.25rem 0;
		color: #1565c0;
	}

	.results-section {
		margin: 2rem 0;
	}

	.location-selector {
		margin: 1.5rem 0;
		padding: 1rem;
		background-color: #f5f5f5;
		border-radius: 8px;
	}

	.location-selector > label {
		display: block;
		margin-bottom: 0.5rem;
		color: #333;
	}

	.display-mode-selector {
		display: flex;
		gap: 1.5rem;
		margin: 1rem 0;
		padding: 0.5rem 0;
	}

	.display-mode-selector label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #333;
		cursor: pointer;
		font-size: 0.95rem;
	}

	.display-mode-selector input[type='radio'] {
		cursor: pointer;
	}

	.location-selector select {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background-color: white;
		cursor: pointer;
	}

	.temperature-display {
		margin: 2rem 0;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 12px;
		color: white;
		text-align: center;
	}

	.temperature-display h2 {
		color: white;
		margin-bottom: 1rem;
		font-weight: 500;
	}

	.temperature-value {
		font-size: 4rem;
		font-weight: bold;
		margin: 1rem 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
	}

	.temperature-metadata {
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
		margin-top: 1rem;
	}
</style>
