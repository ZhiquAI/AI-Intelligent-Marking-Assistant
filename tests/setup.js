/**
 * Jest测试环境配置
 * @description 设置测试环境的全局配置和mock
 */

// 设置测试超时时间
jest.setTimeout(30000);

// Mock Chrome扩展API
global.chrome = {
    storage: {
        local: {
            get: jest.fn().mockResolvedValue({}),
            set: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined)
        },
        session: {
            get: jest.fn().mockResolvedValue({}),
            set: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined)
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
        },
        lastError: null
    },
    tabs: {
        query: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        remove: jest.fn().mockResolvedValue(undefined)
    },
    scripting: {
        executeScript: jest.fn().mockResolvedValue([]),
        insertCSS: jest.fn().mockResolvedValue(undefined)
    },
    downloads: {
        download: jest.fn().mockResolvedValue(1)
    }
};

// Mock Web APIs
global.fetch = jest.fn();
global.Request = jest.fn();
global.Response = jest.fn();

// Mock DOM APIs
global.document = {
    createElement: jest.fn(() => ({
        className: '',
        id: '',
        innerHTML: '',
        style: {},
        attributes: {},
        appendChild: jest.fn(),
        remove: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn()
        }
    })),
    head: {
        appendChild: jest.fn()
    },
    body: {
        appendChild: jest.fn()
    },
    getElementById: jest.fn().mockReturnValue(null),
    querySelector: jest.fn().mockReturnValue(null),
    querySelectorAll: jest.fn().mockReturnValue([]),
    createEvent: jest.fn(() => ({
        initEvent: jest.fn()
    })),
    createRange: jest.fn(() => ({
        selectNode: jest.fn(),
        getBoundingClientRect: jest.fn(() => ({ width: 100, height: 100 }))
    })),
    execCommand: jest.fn()
};

global.window = {
    location: {
        href: 'https://www.zhixue.com/test',
        origin: 'https://www.zhixue.com'
    },
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    sessionStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    getComputedStyle: jest.fn(() => ({
        getPropertyValue: jest.fn()
    })),
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
    cancelAnimationFrame: jest.fn()
};

// Mock btoa and atob for Base64 encoding/decoding
global.btoa = jest.fn(str => Buffer.from(str).toString('base64'));
global.atob = jest.fn(str => Buffer.from(str, 'base64').toString());

// Mock crypto for random number generation
global.crypto = {
    getRandomValues: jest.fn(array => {
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    })
};

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock setTimeout and setInterval
jest.useFakeTimers();

// Global test utilities
global.testUtils = {
    // 创建模拟的AI API响应
    createMockAIResponse: (score, confidence = 0.9) => ({
        choices: [
            {
                message: {
                    content: JSON.stringify({
                        totalScore: score,
                        maxScore: 100,
                        confidence: confidence,
                        dimensions: {
                            accuracy: { score: Math.min(score + 5, 100), maxScore: 100 },
                            completeness: { score: Math.min(score, 100), maxScore: 100 },
                            clarity: { score: Math.max(score - 5, 0), maxScore: 100 }
                        },
                        feedback: score >= 90 ? '优秀答案' : score >= 80 ? '良好答案' : '需要改进',
                        suggestions: ['继续保持良好的表现', '注意细节和完整性']
                    })
                }
            }
        ]
    }),

    // 创建模拟的Gemini API响应
    createMockGeminiResponse: (score, confidence = 0.88) => ({
        candidates: [
            {
                content: {
                    parts: [
                        {
                            text: JSON.stringify({
                                totalScore: score,
                                maxScore: 100,
                                confidence: confidence,
                                dimensions: {
                                    accuracy: { score: Math.min(score + 3, 100), maxScore: 100 },
                                    completeness: {
                                        score: Math.min(score + 2, 100),
                                        maxScore: 100
                                    },
                                    clarity: { score: Math.max(score - 2, 0), maxScore: 100 }
                                },
                                feedback:
                                    score >= 90
                                        ? 'Excellent answer'
                                        : score >= 80
                                          ? 'Good answer'
                                          : 'Needs improvement',
                                suggestions: [
                                    'Maintain good performance',
                                    'Pay attention to details'
                                ]
                            })
                        }
                    ]
                }
            }
        ]
    }),

    // 模拟网络延迟
    simulateNetworkDelay: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

    // 创建测试用的评分标准
    createTestRubric: () => `
# 数学解答题评分标准

## 准确性 (40分)
- 完全正确：40分
- 基本正确，有小错误：30-35分
- 部分正确：15-25分
- 基本错误：0-10分

## 完整性 (30分)
- 步骤完整，逻辑清晰：25-30分
- 步骤基本完整：18-24分
- 缺少关键步骤：9-17分
- 步骤严重缺失：0-8分

## 清晰度 (30分)
- 表达清晰，易于理解：25-30分
- 表达基本清晰：18-24分
- 表达不够清楚：9-17分
- 表达混乱：0-8分
`,

    // 创建测试用的学生答案
    createTestAnswer: (quality = 'good') => {
        const answers = {
            excellent: `
解方程 2x + 5 = 13
步骤1：将常数项移到等式右边
2x = 13 - 5
2x = 8
步骤2：两边同时除以系数
x = 8 ÷ 2
x = 4
验证：将x=4代入原方程
2(4) + 5 = 8 + 5 = 13 ✓
因此，方程的解是x = 4
`,
            good: `
解方程 2x + 5 = 13
2x = 13 - 5
2x = 8
x = 4
答案：x = 4
`,
            poor: `
2x + 5 = 13
x = 6
`
        };
        return answers[quality] || answers.good;
    },

    // 验证评分结果结构
    validateGradingResult: result => {
        expect(result).toHaveProperty('totalScore');
        expect(result).toHaveProperty('maxScore');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('dimensions');
        expect(result).toHaveProperty('feedback');
        expect(result).toHaveProperty('suggestions');

        expect(typeof result.totalScore).toBe('number');
        expect(typeof result.maxScore).toBe('number');
        expect(typeof result.confidence).toBe('number');
        expect(typeof result.feedback).toBe('string');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(typeof result.dimensions).toBe('object');

        // 验证分数范围
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(result.maxScore);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
    }
};

// 清理函数
afterEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.useRealTimers();
});

// 添加一个简单的测试来避免"测试套件必须包含至少一个测试"错误
describe('测试环境设置', () => {
    test('测试环境应该正确设置', () => {
        expect(global.chrome).toBeDefined();
        expect(global.fetch).toBeDefined();
        expect(global.document).toBeDefined();
        expect(global.window).toBeDefined();
        expect(global.testUtils).toBeDefined();
    });
});
