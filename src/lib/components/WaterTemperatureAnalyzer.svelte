<script lang="ts">
	/**
	 * Reusable Water Temperature Analyzer Component
	 *
	 * This component analyzes CSV files containing water temperature data
	 * and displays aggregate statistics by monitoring location. All processing
	 * happens client-side.
	 *
	 */

	import { parseCsv, type ParseResults } from '$lib/CsvParserWeb';
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
	let isDragging = $state(false);

	// Refs
	let fileInput: HTMLInputElement;

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
	 * Process a file - common logic for both file input and drag-and-drop
	 */
	async function processFile(file: File) {
		selectedFile = file;
		errorMessage = null;
		isProcessing = true;

		try {
			// Get the file as a Web ReadableStream
			const stream = file.stream();

			// Parse the CSV file
			const results = await parseCsv(stream);

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
	 * Handle file input change event
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

		await processFile(file);
	}

	/**
	 * Handle click on upload button
	 */
	function handleUploadClick() {
		fileInput.click();
	}

	/**
	 * Handle drag over event
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	/**
	 * Handle drag leave event
	 */
	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	/**
	 * Handle drop event
	 */
	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files[0];
		if (file) {
			await processFile(file);
		}
	}

	/**
	 * Handle monitoring location selection change
	 */
	function handleLocationChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedLocationId = target.value;
	}

	/**
	 * Format file size for display
	 */
	function formatFileSize(bytes: number): string {
		const kb = bytes / 1024;
		if (kb < 1024) {
			return `${kb.toFixed(1)} KB`;
		}
		const mb = kb / 1024;
		return `${mb.toFixed(2)} MB`;
	}
</script>

<div class="water-temp-analyzer">
	<h1>{title}</h1>

	<div
		class="file-input-section"
		class:dragging={isDragging}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="region"
		aria-label="CSV file upload area"
	>
		<input
			bind:this={fileInput}
			id="csv-file-input"
			type="file"
			accept=".csv"
			onchange={handleFileChange}
			aria-label="Upload CSV file"
			style="display: none;"
		/>
		<p class="drop-text" aria-hidden="true">
			Drag a CSV file here, or <button
				type="button"
				onclick={handleUploadClick}
				class="upload-button"
				aria-label="Select CSV file to upload">click to upload</button
			>
		</p>
	</div>

	{#if errorMessage}
		<div class="error-message">
			<p><strong>Error:</strong> {errorMessage}</p>
		</div>
	{/if}

	{#if isProcessing}
		<div class="processing-message">
			<svg class="spinner" viewBox="0 0 50 50" aria-hidden="true">
				<circle class="spinner-ring" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
			</svg>
			<div class="processing-text">
				<p>Processing file: <strong>{selectedFile?.name}</strong></p>
				{#if selectedFile}
					<p class="file-size">Size: {formatFileSize(selectedFile.size)}</p>
				{/if}
				<p>Please wait...</p>
			</div>
		</div>
	{/if}

	{#if parseResults && !isProcessing}
		<div class="results-section">
			<div class="results-content">
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
					</div>
				{/if}
			</div>
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
		padding: 4rem 2rem;
		border: 3px solid #ccc;
		border-radius: 12px;
		background-color: #f9f9f9;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.file-input-section:hover {
		border-color: #667eea;
		background-color: #f0f4ff;
	}

	.file-input-section.dragging {
		border-color: #667eea;
		background-color: #e3f2fd;
		border-style: solid;
	}

	.drop-text {
		margin: 0;
		font-size: 1.25rem;
		color: #666;
	}

	.upload-button {
		background: none;
		border: none;
		color: #667eea;
		font-size: 1.25rem;
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
		font-family: inherit;
		transition: color 0.2s ease;
	}

	.upload-button:hover {
		color: #764ba2;
	}

	.upload-button:focus {
		outline: 2px solid #667eea;
		outline-offset: 2px;
		border-radius: 2px;
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
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		animation: spin 1s linear infinite;
	}

	.spinner-ring {
		stroke: #2196f3;
		stroke-linecap: round;
		stroke-dasharray: 90, 150;
		stroke-dashoffset: 0;
		animation: dash 1.5s ease-in-out infinite;
	}

	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes dash {
		0% {
			stroke-dasharray: 1, 150;
			stroke-dashoffset: 0;
		}
		50% {
			stroke-dasharray: 90, 150;
			stroke-dashoffset: -35;
		}
		100% {
			stroke-dasharray: 90, 150;
			stroke-dashoffset: -124;
		}
	}

	.processing-text {
		flex: 1;
	}

	.processing-message p {
		margin: 0.25rem 0;
		color: #1565c0;
	}

	.file-size {
		font-size: 0.9rem;
		color: #1976d2;
	}

	.results-section {
		margin: 2rem 0;
	}

	.results-content {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	.location-selector {
		flex: 1;
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
		flex: 1;
		padding: 1rem;
		background-color: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 8px;
		color: #333;
		text-align: left;
	}

	.temperature-display h2 {
		color: #333;
		margin: 0 0 0.5rem 0;
		font-weight: 600;
		font-size: 1rem;
	}

	.temperature-value {
		font-size: 3rem;
		font-weight: 600;
		margin: 0;
		color: #333;
	}
</style>
