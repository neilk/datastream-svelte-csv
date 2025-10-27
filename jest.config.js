/** @type {import('jest').Config} */
export default {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^\\$lib(.*)$': '<rootDir>/src/lib$1',
		'^\\$app(.*)$': '<rootDir>/.svelte-kit/runtime/app$1'
	},
	transform: {
		'^.+\\.svelte$': [
			'svelte-jester',
			{
				preprocess: true
			}
		],
		'^.+\\.ts$': 'ts-jest'
	},
	testMatch: ['**/src/**/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/tests/'],
	collectCoverageFrom: ['src/**/*.{ts,svelte}', '!src/**/*.d.ts'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
