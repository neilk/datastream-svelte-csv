/** @type {import('jest').Config} */
export default {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^\\$lib(.*)$': '<rootDir>/src/lib$1',
		'^\\$app(.*)$': '<rootDir>/.svelte-kit/runtime/app$1',
		'^(\\.{1,2}/.*)\\.js$': '$1'
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
	testMatch: ['**/tests/unit/**/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/'],
	collectCoverageFrom: ['src/**/*.{ts,svelte}', '!src/**/*.d.ts'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
