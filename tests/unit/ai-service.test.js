/**
 * AI服务单元测试
 * @description 测试AI服务的核心功能
 */

import { AIService } from '../../ai-grading-extension/services/ai-service.js';
import {
    validateData,
    securityCheck,
    encrypt,
    decrypt,
    hash
} from '../../ai-grading-extension/utils/security-utils.js';

// Mock Chrome storage API
const mockChromeStorage = {
    local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn()
    }
};

// Mock Toast通知器
const mockToastNotifier = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
};

// 设置全局mock
global.chrome = {
    storage: mockChromeStorage
};

global.toastNotifier = mockToastNotifier;

describe('AIService', () => {
    let aiService;

    beforeEach(async () => {
        // 重置所有mock
        jest.clearAllMocks();

        // 创建新的AI服务实例
        aiService = new AIService();

        // Mock security-utils的方法 - 使用动态导入
        const securityUtils = await import('../../ai-grading-extension/utils/security-utils.js');
        jest.spyOn(securityUtils, 'validateData').mockReturnValue(true);
        jest.spyOn(securityUtils, 'securityCheck').mockReturnValue(true);
        jest.spyOn(securityUtils, 'encrypt').mockResolvedValue('encrypted');
        jest.spyOn(securityUtils, 'decrypt').mockResolvedValue('decrypted');
        jest.spyOn(securityUtils, 'hash').mockReturnValue('hashed');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(aiService.apiKey).toBe('');
            expect(aiService.apiType).toBe('openai');
            expect(aiService.maxRetries).toBe(3);
            expect(aiService.rateLimitDelay).toBe(1000);
        });
    });

    describe('Configuration', () => {
        test('should configure API settings successfully', async () => {
            const config = {
                apiKey: 'test-api-key',
                apiType: 'gemini',
                apiEndpoint: 'https://custom.endpoint.com',
                debugMode: true
            };

            await aiService.configure(config);

            expect(aiService.apiKey).toBe('test-api-key');
            expect(aiService.apiType).toBe('gemini');
            expect(aiService.apiEndpoint).toBe('https://custom.endpoint.com');
            expect(aiService.isDebugMode).toBe(true);

            // 验证安全存储被调用
            expect(securityUtils.secureSet).toHaveBeenCalledWith('ai_api_key', 'test-api-key');
        });

        test('should handle invalid API key format', async () => {
            // Mock不安全的输入
            securityUtils.isSafeInput.mockReturnValue(false);

            const config = {
                apiKey: 'dangerous-key<script>',
                apiType: 'openai'
            };

            await expect(aiService.configure(config)).rejects.toThrow('无效的API密钥格式');
        });

        test('should show success notification on configuration', async () => {
            const config = {
                apiKey: 'valid-api-key',
                apiType: 'openai'
            };

            await aiService.configure(config);

            expect(mockToastNotifier.success).toHaveBeenCalledWith('AI服务配置成功');
        });

        test('should show error notification on configuration failure', async () => {
            // Mock安全存储失败
            securityUtils.secureSet.mockResolvedValue(false);

            const config = {
                apiKey: 'test-api-key',
                apiType: 'openai'
            };

            await expect(aiService.configure(config)).rejects.toThrow('API密钥存储失败');
            expect(mockToastNotifier.error).toHaveBeenCalledWith('AI服务配置失败: API密钥存储失败');
        });
    });

    describe('API Key Management', () => {
        test('should securely store API key', async () => {
            const apiKey = 'test-secret-key';

            await aiService.setApiKey(apiKey);

            expect(aiService.apiKey).toBe(apiKey);
            expect(securityUtils.secureSet).toHaveBeenCalledWith('ai_api_key', apiKey);
            expect(mockToastNotifier.success).toHaveBeenCalledWith('AI服务配置成功');
        });

        test('should retrieve stored API key', async () => {
            const storedKey = 'stored-secret-key';
            securityUtils.secureGet.mockResolvedValue(storedKey);

            const result = await aiService.getApiKey();

            expect(result).toBe(storedKey);
            expect(securityUtils.secureGet).toHaveBeenCalledWith('ai_api_key');
        });

        test('should clear API key', async () => {
            aiService.apiKey = 'test-key';

            const result = await aiService.clearApiKey();

            expect(aiService.apiKey).toBe('');
            expect(securityUtils.secureRemove).toHaveBeenCalledWith('ai_api_key');
            expect(result).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should provide user-friendly error messages', () => {
            const testCases = [
                { error: { status: '401' }, expected: 'API密钥无效或已过期，请检查设置' },
                { error: { status: '403' }, expected: 'API访问被拒绝，请检查权限设置' },
                { error: { status: '404' }, expected: 'API服务不可用，请稍后重试' },
                { error: { status: '429' }, expected: 'API请求过于频繁，请稍后再试' },
                { error: { status: '500' }, expected: 'AI服务内部错误，请稍后重试' },
                { error: { code: 'network' }, expected: '网络连接失败，请检查网络设置' },
                { error: { code: 'timeout' }, expected: 'AI服务响应超时，请稍后重试' },
                { error: {}, expected: 'AI服务暂时不可用，请稍后重试' }
            ];

            testCases.forEach(({ error, expected }) => {
                const result = aiService.getUserFriendlyErrorMessage(error);
                expect(result).toBe(expected);
            });
        });

        test('should handle retry mechanism', async () => {
            let attempts = 0;
            const mockApiCall = jest.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Network error');
                }
                return 'success';
            });

            const result = await aiService.callWithRetry(mockApiCall, 'test operation');

            expect(result).toBe('success');
            expect(mockApiCall).toHaveBeenCalledTimes(3);
            expect(attempts).toBe(3);
        });

        test('should fail after max retries', async () => {
            const mockApiCall = jest.fn().mockRejectedValue(new Error('Persistent error'));

            await expect(aiService.callWithRetry(mockApiCall, 'test operation')).rejects.toThrow(
                'test operation 在3次尝试后失败'
            );

            expect(mockApiCall).toHaveBeenCalledTimes(3);
            expect(mockToastNotifier.error).toHaveBeenCalledWith('AI服务暂时不可用，请稍后重试');
        });
    });

    describe('Grading Operations', () => {
        beforeEach(() => {
            // Mock successful API responses
            aiService.apiKey = 'valid-api-key';
            aiService.callWithRetry = jest.fn().mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: `{
              "totalScore": 85,
              "maxScore": 100,
              "confidence": 0.9,
              "dimensions": {
                "accuracy": {"score": 90, "maxScore": 100},
                "completeness": {"score": 80, "maxScore": 100}
              },
              "feedback": "Good answer with minor issues",
              "suggestions": ["Check your calculations"]
            }`
                        }
                    }
                ]
            });
        });

        test('should perform grading successfully', async () => {
            const params = {
                rubric: 'Test rubric',
                studentAnswer: 'Student answer',
                question: 'Test question'
            };

            const result = await aiService.performGrading(params);

            expect(result.totalScore).toBe(85);
            expect(result.maxScore).toBe(100);
            expect(result.confidence).toBe(0.9);
            expect(mockToastNotifier.success).toHaveBeenCalledWith('评分完成！得分：85/100');
        });

        test('should handle missing API key', async () => {
            aiService.apiKey = '';

            const params = {
                rubric: 'Test rubric',
                studentAnswer: 'Student answer'
            };

            await expect(aiService.performGrading(params)).rejects.toThrow('未配置API密钥');

            expect(mockToastNotifier.error).toHaveBeenCalledWith('请先配置AI服务的API密钥');
        });

        test('should handle missing parameters', async () => {
            const params = {
                rubric: '',
                studentAnswer: ''
            };

            await expect(aiService.performGrading(params)).rejects.toThrow('缺少必要的评分参数');

            expect(mockToastNotifier.warning).toHaveBeenCalledWith('评分参数不完整，请检查输入');
        });
    });

    describe('Default Endpoints', () => {
        test('should return correct default endpoints', () => {
            const endpoints = {
                openai: 'https://api.openai.com/v1/chat/completions',
                gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                claude: 'https://api.anthropic.com/v1/messages'
            };

            Object.entries(endpoints).forEach(([apiType, expectedEndpoint]) => {
                aiService.apiType = apiType;
                const endpoint = aiService.getDefaultEndpoint();
                expect(endpoint).toBe(expectedEndpoint);
            });
        });

        test('should return OpenAI endpoint for unknown API type', () => {
            aiService.apiType = 'unknown';
            const endpoint = aiService.getDefaultEndpoint();
            expect(endpoint).toBe('https://api.openai.com/v1/chat/completions');
        });
    });
});
