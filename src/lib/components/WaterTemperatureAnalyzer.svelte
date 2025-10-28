<script lang="ts">
	/**
	 * Reusable Water Temperature Analyzer Component
	 *
	 * This component analyzes CSV files containing water temperature data
	 * and displays aggregate statistics by monitoring location.
	 *
	 * Can be dropped into any Svelte application.
	 */

	// Props for customization
	export let title: string = 'Water Temperature Analysis';
</script>

<div class="water-temp-analyzer">
	<h1>{title}</h1>
	<p>CSV processing application - implementation coming soon</p>
</div>

<style>
	.water-temp-analyzer {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		color: #333;
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	p {
		color: #666;
		font-size: 1rem;
	}
</style>
