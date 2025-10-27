import { test, expect } from '@playwright/test';

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Water Temperature Analysis');
});

test('page has correct title', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Water Temperature Analysis');
});
