/**
 * 安全工具单元测试 - 简化版
 * @description 测试安全工具模块的基本功能
 */

import {
    generateSecureId,
    escapeHtml,
    securityCheck,
    validateData
} from '../../ai-grading-extension/utils/security-utils.js';

describe('SecurityUtils - Basic Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Secure ID Generation', () => {
        test('should generate random ID of specified length', () => {
            const id1 = generateSecureId(16);
            const id2 = generateSecureId(16);

            expect(id1).toHaveLength(16);
            expect(id2).toHaveLength(16);
            expect(id1).not.toBe(id2); // Should be random
        });

        test('should use default length of 16', () => {
            const id = generateSecureId();
            expect(id).toHaveLength(16);
        });

        test('should generate ID with valid characters', () => {
            const id = generateSecureId(32);
            const validChars = /^[A-Za-z0-9]+$/;
            expect(id).toMatch(validChars);
        });
    });

    describe('HTML Escaping', () => {
        test('should escape HTML special characters', () => {
            const input = '<script>alert("XSS")</script>';
            const result = escapeHtml(input);

            expect(result).toContain('&lt;'); // < becomes &lt;
            expect(result).toContain('&gt;'); // > becomes &gt;
            expect(result).toContain('&quot;'); // " becomes &quot;
        });

        test('should handle empty input', () => {
            expect(escapeHtml('')).toBe('');
        });
    });

    describe('Input Validation', () => {
        test('should handle string input safely', () => {
            // Test string input - securityCheck returns an object
            const stringResult = securityCheck('Hello World');
            expect(typeof stringResult).toBe('object');
            expect(stringResult).toHaveProperty('safe');
            expect(stringResult).toHaveProperty('sanitized');
        });

        test('should handle safe mathematical content', () => {
            const mathResult = securityCheck('2x + 5 = 13');
            expect(typeof mathResult).toBe('object');
            expect(mathResult).toHaveProperty('safe');
            expect(mathResult).toHaveProperty('sanitized');
        });

        test('should handle educational content', () => {
            const eduResult = securityCheck('The answer is 42.');
            expect(typeof eduResult).toBe('object');
            expect(eduResult).toHaveProperty('safe');
            expect(eduResult).toHaveProperty('sanitized');
        });
    });

    describe('Data Validation', () => {
        test('should validate different data types', () => {
            // Test string validation
            const stringResult = validateData('test string', 'string');
            expect(typeof stringResult).toBe('object');
            expect(stringResult).toHaveProperty('valid');
            expect(stringResult).toHaveProperty('sanitized');

            // Test number validation
            const numberResult = validateData(123, 'number');
            expect(typeof numberResult).toBe('object');
            expect(numberResult).toHaveProperty('valid');
            expect(numberResult).toHaveProperty('sanitized');

            // Test boolean validation
            const boolResult = validateData(true, 'boolean');
            expect(typeof boolResult).toBe('object');
            expect(boolResult).toHaveProperty('valid');
            expect(boolResult).toHaveProperty('sanitized');
        });

        test('should handle invalid data', () => {
            const result = validateData('invalid', 'email');
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('error');
        });
    });
});
