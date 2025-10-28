import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('Basic', () => {
	test('index page has expected h1, title', async ({ page }) => {
		await expect(page.locator('h1')).toHaveText('Water Temperature Analysis');
		await expect(page).toHaveTitle('Water Temperature Analysis');
	});
});

test.describe('Simple file parsing', () => {
	test.beforeAll(async ({ page }) => {
		await page.goto('/');
		const sampleCsvPath = resolve(__dirname, '../data/sample.csv');
		const fileInput = page.locator('input[type="file"]');
		await fileInput.setInputFiles(sampleCsvPath);

		// Wait for results to be displayed - wait for the select to appear
		await expect(page.locator('#monitoring-location-select')).toBeVisible();
	});

	test('displays correct average for all locations', async ({ page }) => {
		// The default selection should be "-ALL-" (All Locations)
		await expect(page.locator('#monitoring-location-select')).toHaveValue('-ALL-');

		// Check that the average temperature is displayed correctly (16.258°C)
		const tempValue = page.locator('.temperature-value');
		await expect(tempValue).toContainText('16.26');
	});

	test('displays correct average for specific location by ID', async ({ page }) => {
		// Switch to "By ID" display mode
		const byIdRadio = page.locator('input[type="radio"][value="id"]');
		await byIdRadio.click();

		// Select the specific location by ID
		const locationSelect = page.locator('#monitoring-location-select');
		await locationSelect.selectOption('RivTemp-Qc-16-100');

		// Check that the average temperature is displayed correctly (16.32°C)
		const tempValue = page.locator('.temperature-value');
		await expect(tempValue).toContainText('16.32');

		// Check that the metadata shows the correct location name
		const metadata = page.locator('.temperature-metadata');
		await expect(metadata).toContainText('Morin P - Riv. Ste-Marguerite (Saguenay)');
	});

	test('displays correct average for specific location by Name', async ({ page }) => {
		// Default is "By Name", so select location by name
		const locationSelect = page.locator('#monitoring-location-select');
		await locationSelect.selectOption('RivTemp-Qc-16-100'); // Still selects by ID value

		// Check that the average temperature is displayed correctly
		const tempValue = page.locator('.temperature-value');
		await expect(tempValue).toContainText('16.32');
	});

	test('switches between ID and Name display modes', async ({ page }) => {
		// Default is "By Name"
		const byNameRadio = page.locator('input[type="radio"][value="name"]');
		await expect(byNameRadio).toBeChecked();

		// Options should display names (not IDs)
		const firstOption = page.locator('#monitoring-location-select option').nth(1); // Skip "-ALL-"
		const firstOptionText = await firstOption.textContent();
		expect(firstOptionText).not.toMatch(/^RivTemp-Qc-/); // Should not start with ID pattern

		// Switch to "By ID"
		const byIdRadio = page.locator('input[type="radio"][value="id"]');
		await byIdRadio.click();
		await expect(byIdRadio).toBeChecked();

		// Options should now display IDs
		const firstOptionAfter = page.locator('#monitoring-location-select option').nth(1);
		const firstOptionTextAfter = await firstOptionAfter.textContent();
		expect(firstOptionTextAfter).toMatch(/^RivTemp-Qc-/); // Should start with ID pattern
	});
});

// TODO:
// improperly formatted files
// zero length files
// large files (~1MB)
// replacing the file (or trashing it, blank the file)
// display of filename
