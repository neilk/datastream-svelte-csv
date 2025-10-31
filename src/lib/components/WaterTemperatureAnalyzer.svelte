<script lang="ts">
	/**
	 * Reusable Water Temperature Analyzer Component
	 *
	 * This component analyzes CSV files containing water temperature data
	 * and displays aggregate statistics by monitoring location. All processing
	 * happens client-side.
	 *
	 */

	import { parseCsv, CancellationError, type CsvParseOperation } from '$lib/CsvParserWeb';
	import type { ParseResults } from '$lib/CsvParser';
	import type { LocationResult } from '$lib/RecordDataAccumulator';

	/**
	 * Encapsulates a file and its processing lifecycle
	 */
	type FileProcessing = {
		file: File;
		state: 'processing' | 'completed' | 'error';
		operation: CsvParseOperation;
		results?: ParseResults;
		error?: string;
	};

	// Props for customization
	interface Props {
		title?: string;
	}

	const { title = 'Water Temperature Analysis' }: Props = $props();

	// State
	let fileProcessing = $state<FileProcessing | null>(null);
	let selectedLocationId = $state('-ALL-');
	let displayMode = $state<'id' | 'name'>('name');
	let isDragging = $state(false);

	// Refs
	let fileInput: HTMLInputElement;

	// Derived state
	let monitoringLocations = $derived<Map<string, string>>(
		fileProcessing?.results?.monitoringLocations ?? new Map<string, string>()
	);
	let sortedLocations = $derived.by(() => {
		const entries = [...monitoringLocations.entries()];
		return entries.sort((a, b) => {
			const aLabel = displayMode === 'id' ? a[0] : a[1];
			const bLabel = displayMode === 'id' ? b[0] : b[1];
			return aLabel.localeCompare(bLabel);
		});
	});
	let currentResult = $derived.by((): LocationResult | null => {
		if (!fileProcessing?.results) return null;
		return fileProcessing.results.monitoringLocationResults.get(selectedLocationId) ?? null;
	});

	/**
	 * Process a file - common logic for both file input and drag-and-drop
	 */
	async function processFile(file: File) {
		// Cancel any existing processing operation
		if (fileProcessing) {
			fileProcessing.operation.cancel();
		}

		// Create new file processing with 'processing' state
		const operation = parseCsv(file);
		fileProcessing = {
			file,
			state: 'processing',
			operation
		};

		try {
			// Wait for results
			const results = await operation.results;

			// Update to completed state
			fileProcessing = {
				...fileProcessing,
				state: 'completed',
				results
			};

			// Reset to show all locations by default
			selectedLocationId = '-ALL-';
		} catch (error) {
			// Don't show error message if it was cancelled by the user
			if (error instanceof CancellationError) {
				// Silent cancellation - user initiated - reset to initial state
				fileProcessing = null;
				if (fileInput) {
					fileInput.value = '';
				}
			} else {
				// Error state - keep file but show error
				const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
				fileProcessing = {
					...fileProcessing,
					state: 'error',
					error: errorMessage
				};
			}
		}
	}

	/**
	 * Handle file input change event
	 */
	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] || null;

		if (!file) {
			fileProcessing = null;
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
	const FILE_SIZE_UNITS: string[] = ['bytes', 'KB', 'MB', 'GB', 'TB'];
	function formatFileSize(bytes: number): string {
		let i = 0;
		while (bytes > 1024 && i < FILE_SIZE_UNITS.length) {
			bytes /= 1024;
			i++;
		}
		const abbreviation = FILE_SIZE_UNITS[i];
		return `${bytes.toFixed(i > 0 ? 2 : 0)} ${abbreviation}`;
	}

	/**
	 * Format file last modified date in ISO 8601 format with timezone
	 */
	function formatFileDate(timestamp: number): string {
		const date = new Date(timestamp);
		return new Intl.DateTimeFormat('en-CA', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		}).format(date);
	}

	/**
	 * Cancel the current processing operation
	 */
	function handleCancel() {
		if (fileProcessing) {
			fileProcessing.operation.cancel();
			// The processFile catch block will set fileProcessing to null
		}
	}

	/**
	 * Clear the current file and reset state
	 */
	function handleClear() {
		fileProcessing = null;
		selectedLocationId = '-ALL-';
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<div class="water-temp-analyzer">
	<h1>{title}</h1>

	<input
		bind:this={fileInput}
		id="csv-file-input"
		type="file"
		accept=".csv"
		onchange={handleFileChange}
		aria-label="Upload CSV file"
		style="display: none;"
	/>

	{#if !fileProcessing}
		<div
			class="file-input-section"
			class:dragging={isDragging}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="region"
			aria-label="CSV file upload area"
		>
			<p class="drop-text" aria-hidden="true">
				Drag a CSV file here, or <button
					type="button"
					onclick={handleUploadClick}
					class="upload-button"
					aria-label="Select CSV file to upload">click to upload</button
				>
			</p>
		</div>
	{/if}

	{#if fileProcessing}
		<div class="results-section">
			<div class="file-info-header">
				<div class="file-info-content">
					<h2><span class="filename">{fileProcessing.file.name}</span></h2>
					<p class="file-date">
						Last modified: {formatFileDate(fileProcessing.file.lastModified)}
						• Size: {formatFileSize(fileProcessing.file.size)}
					</p>
				</div>
				{#if fileProcessing.state === 'processing'}
					<div class="processing-controls">
						<svg class="spinner" viewBox="0 0 50 50" aria-hidden="true">
							<circle class="spinner-ring" cx="25" cy="25" r="20" fill="none" stroke-width="5"
							></circle>
						</svg>
						<button
							type="button"
							class="cancel-button"
							onclick={handleCancel}
							aria-label="Cancel processing"
						>
							Cancel
						</button>
					</div>
				{:else if fileProcessing.state === 'completed' || fileProcessing.state === 'error'}
					<button
						type="button"
						class="clear-button"
						onclick={handleClear}
						aria-label="Clear file and upload a new one"
					>
						Clear
					</button>
				{/if}
			</div>

			{#if fileProcessing.state === 'completed' && fileProcessing.results}
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
			{:else if fileProcessing.state === 'error'}
				<div class="error-message">
					<p><strong>Error:</strong> {fileProcessing.error}</p>
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
		padding: 1rem;
		background-color: #ffebee;
		border-left: 4px solid #f44336;
	}

	.error-message p {
		margin: 0;
		color: #c62828;
	}

	.spinner {
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		animation: spin 1s linear infinite;
	}

	.spinner-ring {
		stroke: #667eea;
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

	.results-section {
		margin: 2rem 0;
		background-color: #f5f5f5;
		border-radius: 8px;
		border: 3px solid #ccc;
		overflow: hidden;
	}

	.file-info-header {
		padding: 1rem;
		border-bottom: 1px solid #ddd;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.file-info-content {
		flex: 1;
	}

	.file-info-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #333;
	}

	.filename {
		color: #667eea;
		font-weight: 600;
	}

	.file-date {
		margin: 0;
		font-size: 0.9rem;
		color: #666;
	}

	.processing-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.cancel-button,
	.clear-button {
		padding: 0.75rem 1.5rem;
		background-color: #667eea;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.cancel-button:hover,
	.clear-button:hover {
		background-color: #764ba2;
	}

	.cancel-button:focus,
	.clear-button:focus {
		outline: 2px solid #667eea;
		outline-offset: 2px;
	}

	.results-content {
		display: flex;
		gap: 0;
		align-items: flex-start;
		padding: 1rem;
	}

	.location-selector {
		flex: 3;
		padding: 1rem;
		border-right: 1px solid #ddd;
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
		flex: 2;
		padding: 1rem;
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
