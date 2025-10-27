import { describe, it, expect } from '@jest/globals';

describe('Example test suite', () => {
	it('should pass a simple test', () => {
		expect(1 + 1).toBe(2);
	});

	it('should handle string concatenation', () => {
		expect('hello' + ' ' + 'world').toBe('hello world');
	});
});
