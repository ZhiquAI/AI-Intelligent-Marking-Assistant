/**
 * AI服务单元测试 - 简化版
 * @description 测试AI服务的核心功能
 */

import { AIService } from '../../ai-grading-extension/services/ai-service.js';

// Mock Chrome storage API
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn()
        }
    }
};

// Mock toast通知器
global.toastNotifier = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
};

describe('AIService - Basic Tests', () => {
    let aiService;

    beforeEach(() => {
        // 重置所有mock
        jest.clearAllMocks();

        // 创建新的AI服务实例
        aiService = new AIService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(aiService.apiKey).toBe('');
            expect(aiService.apiType).toBe('openai');
            expect(aiService.maxRetries).toBe(3);
            expect(aiService.retryDelay).toBe(2000); // Changed from 1000 to 2000
            expect(aiService.requestQueue).toEqual([]);
            expect(aiService.isProcessingQueue).toBe(false);
        });

        test('should have default model parameters', () => {
            expect(aiService.modelParams).toEqual({
                temperature: 0.7,
                maxTokens: 2048,
                topP: 1
            });
        });

        test('should have rate limit delay', () => {
            expect(aiService.rateLimitDelay).toBe(1000);
        });
    });

    describe('Basic Configuration', () => {
        test('should update API type', () => {
            aiService.apiType = 'gemini';
            expect(aiService.apiType).toBe('gemini');
        });

        test('should update model parameters', () => {
            aiService.modelParams.temperature = 0.8;
            aiService.modelParams.maxTokens = 1024;
            expect(aiService.modelParams.temperature).toBe(0.8);
            expect(aiService.modelParams.maxTokens).toBe(1024);
        });
    });

    describe('API Key Management', () => {
        test('should check if API key exists', () => {
            expect(aiService.apiKey).toBe('');
            aiService.apiKey = 'test-key';
            expect(aiService.apiKey).toBe('test-key');
        });
    });

    describe('Default Endpoints', () => {
        test('should return correct default endpoints', () => {
            // Test with current apiType (openai)
            expect(aiService.getDefaultEndpoint()).toBe(
                'https://api.openai.com/v1/chat/completions'
            );

            // Test with gemini
            aiService.apiType = 'gemini';
            expect(aiService.getDefaultEndpoint()).toBe(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
            );

            // Test with claude
            aiService.apiType = 'claude';
            expect(aiService.getDefaultEndpoint()).toBe('https://api.anthropic.com/v1/messages');
        });

        test('should return OpenAI endpoint for unknown API type', () => {
            aiService.apiType = 'unknown';
            expect(aiService.getDefaultEndpoint()).toBe(
                'https://api.openai.com/v1/chat/completions'
            );
        });
    });
});
