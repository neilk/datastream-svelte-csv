import { defineConfig, devices } from '@playwright/test';

// Turned off parallelism because it seemed to make it more reliable.
export default defineConfig({
	testDir: './tests/browser',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1, // process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],

	webServer: {
		command: 'npm run build && npm run preview',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI
	}
});
