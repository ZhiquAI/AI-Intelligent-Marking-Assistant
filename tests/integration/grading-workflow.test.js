/**
 * AI评分工作流集成测试
 * @description 测试完整的AI评分流程
 */

import { gradingManager } from '../../ai-grading-extension/core/grading/index.js';
import { toastNotifier } from '../../ai-grading-extension/ui/components/toast-notifier.js';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock Toast通知器
global.toastNotifier = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn()
};

// Mock fetch API
global.fetch = jest.fn();

describe('AI Grading Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置全局实例
    gradingManager.isInitialized = false;
    gradingManager.aiScorer.apiKey = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Grading Workflow', () => {
    test('should perform successful single model grading', async () => {
      // Mock successful API response
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              totalScore: 85,
              maxScore: 100,
              confidence: 0.92,
              dimensions: {
                accuracy: { score: 90, maxScore: 100 },
                completeness: { score: 80, maxScore: 100 },
                clarity: { score: 85, maxScore: 100 }
              },
              feedback: "答案基本正确，但缺少关键步骤的详细说明。",
              suggestions: [
                "建议详细说明计算过程",
                "可以增加更多相关例子"
              ]
            })
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      // Initialize grading manager
      await gradingManager.initialize();

      // Configure with API key
      await gradingManager.aiScorer.configure({
        api: {
          key: 'test-openai-key',
          type: 'openai',
          endpoint: 'https://api.openai.com/v1/chat/completions'
        },
        model: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1
        }
      });

      // Test data
      const rubric = `
评分标准：
1. 准确性 (40分)：答案是否正确
2. 完整性 (30分)：是否包含所有必要步骤
3. 清晰度 (30分)：表达是否清晰易懂

题目：计算 2x + 5 = 13 中的x值
`;

      const studentAnswer = `
解方程 2x + 5 = 13
2x = 13 - 5
2x = 8
x = 4
答案：x = 4
`;

      const question = '解方程 2x + 5 = 13';

      // Perform grading
      const result = await gradingManager.scoreAnswer(question, studentAnswer, rubric);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.totalScore).toBe(85);
      expect(result.maxScore).toBe(100);
      expect(result.confidence).toBe(0.92);
      expect(result.dimensions).toBeDefined();
      expect(result.feedback).toContain('基本正确');
      expect(result.suggestions).toBeInstanceOf(Array);

      // Verify notifications
      expect(global.toastNotifier.info).toHaveBeenCalledWith(
        '正在分析学生答案，请稍候...',
        expect.objectContaining({
          duration: 2000,
          showProgress: true
        })
      );
      expect(global.toastNotifier.success).toHaveBeenCalledWith('评分完成！得分：85/100');
    });

    test('should handle grading with missing API key', async () => {
      await gradingManager.initialize();

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Student answer',
        question: 'Test question'
      };

      await expect(gradingManager.scoreAnswer(params))
        .rejects.toThrow('未配置API密钥');

      expect(global.toastNotifier.error).toHaveBeenCalledWith(
        '请先配置AI服务的API密钥'
      );
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      await gradingManager.initialize();

      // Configure with API key
      await gradingManager.aiScorer.configure({
        api: {
          key: 'invalid-key',
          type: 'openai'
        }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Student answer',
        question: 'Test question'
      };

      await expect(gradingManager.scoreAnswer(params))
        .rejects.toThrow('AI评分失败');

      expect(global.toastNotifier.error).toHaveBeenCalled();
    });
  });

  describe('Batch Grading Workflow', () => {
    test('should process multiple answers efficiently', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              totalScore: Math.floor(Math.random() * 40) + 60, // 60-100
              maxScore: 100,
              confidence: 0.9,
              dimensions: {
                accuracy: { score: 85, maxScore: 100 },
                completeness: { score: 80, maxScore: 100 }
              },
              feedback: "答案质量良好",
              suggestions: ["继续保持"]
            })
          }
        }]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const answers = [
        {
          rubric: '标准1',
          studentAnswer: '答案1',
          question: '问题1'
        },
        {
          rubric: '标准2',
          studentAnswer: '答案2',
          question: '问题2'
        },
        {
          rubric: '标准3',
          studentAnswer: '答案3',
          question: '问题3'
        }
      ];

      // Perform batch grading
      const results = await gradingManager.batchScore(answers);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);

      results.forEach(result => {
        expect(result.totalScore).toBeGreaterThanOrEqual(60);
        expect(result.totalScore).toBeLessThanOrEqual(100);
        expect(result.maxScore).toBe(100);
        expect(result.confidence).toBe(0.9);
      });
    });
  });

  describe('Progress Tracking', () => {
    test('should track grading progress accurately', async () => {
      await gradingManager.initialize();

      const answers = Array(10).fill(null).map((_, index) => ({
        rubric: `Rubric ${index}`,
        studentAnswer: `Answer ${index}`,
        question: `Question ${index}`
      }));

      // Mock API responses with delay to simulate real processing
      global.fetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    totalScore: 80,
                    maxScore: 100,
                    confidence: 0.9,
                    dimensions: {},
                    feedback: "Good",
                    suggestions: []
                  })
                }
              }]
            })
          }), 100)
        )
      );

      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      // Start batch grading
      const gradingPromise = gradingManager.batchScore(answers);

      // Check progress during grading
      const progress1 = gradingManager.getProgress();
      expect(progress1.total).toBe(10);
      expect(progress1.completed).toBe(0);
      expect(progress1.percentage).toBe(0);

      // Wait for completion
      await gradingPromise;

      // Check final progress
      const finalProgress = gradingManager.getProgress();
      expect(finalProgress.total).toBe(10);
      expect(finalProgress.completed).toBe(10);
      expect(finalProgress.percentage).toBe(100);
    });
  });

  describe('Dual Model Grading', () => {
    test('should perform dual model grading when enabled', async () => {
      const gpt4oResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              totalScore: 85,
              maxScore: 100,
              confidence: 0.9,
              dimensions: {}
            })
          }
        }]
      };

      const geminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                totalScore: 82,
                maxScore: 100,
                confidence: 0.88,
                dimensions: {}
              })
            }]
          }
        }]
      };

      // Mock both API calls
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => gpt4oResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => geminiResponse
        });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Test answer',
        question: 'Test question',
        dualModel: true
      };

      const result = await gradingManager.scoreAnswer(params);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(82);
      expect(result.totalScore).toBeLessThanOrEqual(85);
      expect(result.confidence).toBeGreaterThanOrEqual(0.88);

      // Should show dual model notification
      expect(global.toastNotifier.info).toHaveBeenCalledWith(
        '正在使用双模型交叉验证，请稍候...',
        expect.objectContaining({
          duration: 3000,
          showProgress: true
        })
      );
    });
  });

  describe('Error Recovery', () => {
    test('should handle network failures with retry', async () => {
      let attemptCount = 0;

      global.fetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  totalScore: 75,
                  maxScore: 100,
                  confidence: 0.85
                })
              }
            }]
          })
        });
      });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Test answer',
        question: 'Test question'
      };

      const result = await gradingManager.scoreAnswer(params);

      expect(result.totalScore).toBe(75);
      expect(attemptCount).toBe(3); // Should retry 3 times
    });

    test('should fallback to single model when dual model fails', async () => {
      // Mock dual model failure
      global.fetch
        .mockRejectedValueOnce(new Error('GPT-4o failed'))
        .mockRejectedValueOnce(new Error('Gemini failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  totalScore: 70,
                  maxScore: 100,
                  confidence: 0.8
                })
              }
            }]
          })
        });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Test answer',
        question: 'Test question',
        dualModel: true
      };

      const result = await gradingManager.scoreAnswer(params);

      expect(result.totalScore).toBe(70);
      expect(global.toastNotifier.warning).toHaveBeenCalledWith(
        '双模型验证失败，使用单模型结果',
        { duration: 3000 }
      );
    });
  });

  describe('Score Synchronization', () => {
    test('should sync scores to external system', async () => {
      const mockScores = [
        { studentId: 'student1', score: 85, questionId: 'q1' },
        { studentId: 'student2', score: 92, questionId: 'q2' },
        { studentId: 'student3', score: 78, questionId: 'q3' }
      ];

      await gradingManager.initialize();

      // Mock the sync engine
      gradingManager.scoreSyncEngine.sync = jest.fn().mockResolvedValue({
        success: true,
        syncedCount: 3,
        errors: []
      });

      const result = await gradingManager.syncScores(mockScores);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(3);
      expect(gradingManager.scoreSyncEngine.sync).toHaveBeenCalledWith(mockScores);
    });
  });
});

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock Toast通知器
global.toastNotifier = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn()
};

// Mock fetch API
global.fetch = jest.fn();

describe('AI Grading Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置全局实例
    gradingManager.isInitialized = false;
    gradingManager.aiScorer.apiKey = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Grading Workflow', () => {
    test('should perform successful single model grading', async () => {
      // Mock successful API response
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              totalScore: 85,
              maxScore: 100,
              confidence: 0.92,
              dimensions: {
                accuracy: { score: 90, maxScore: 100 },
                completeness: { score: 80, maxScore: 100 },
                clarity: { score: 85, maxScore: 100 }
              },
              feedback: "答案基本正确，但缺少关键步骤的详细说明。",
              suggestions: [
                "建议详细说明计算过程",
                "可以增加更多相关例子"
              ]
            })
          }
        }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      // Initialize grading manager
      await gradingManager.initialize();

      // Configure with API key
      await gradingManager.aiScorer.configure({
        api: {
          key: 'test-openai-key',
          type: 'openai',
          endpoint: 'https://api.openai.com/v1/chat/completions'
        },
        model: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 1
        }
      });

      // Test data
      const rubric = `
评分标准：
1. 准确性 (40分)：答案是否正确
2. 完整性 (30分)：是否包含所有必要步骤
3. 清晰度 (30分)：表达是否清晰易懂

题目：计算 2x + 5 = 13 中的x值
`;

      const studentAnswer = `
解方程 2x + 5 = 13
2x = 13 - 5
2x = 8
x = 4
答案：x = 4
`;

      const question = '解方程 2x + 5 = 13';

      // Perform grading
      const result = await gradingManager.scoreAnswer(question, studentAnswer, rubric);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.totalScore).toBe(85);
      expect(result.maxScore).toBe(100);
      expect(result.confidence).toBe(0.92);
      expect(result.dimensions).toBeDefined();
      expect(result.feedback).toContain('基本正确');
      expect(result.suggestions).toBeInstanceOf(Array);

      // Verify notifications
      expect(global.toastNotifier.info).toHaveBeenCalledWith(
        '正在分析学生答案，请稍候...',
        expect.objectContaining({
          duration: 2000,
          showProgress: true
        })
      );
      expect(global.toastNotifier.success).toHaveBeenCalledWith('评分完成！得分：85/100');
    });

    test('should handle grading with missing API key', async () => {
      await gradingManager.initialize();

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Student answer',
        question: 'Test question'
      };

      await expect(gradingManager.scoreAnswer(params))
        .rejects.toThrow('未配置API密钥');

      expect(global.toastNotifier.error).toHaveBeenCalledWith(
        '请先配置AI服务的API密钥'
      );
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      await gradingManager.initialize();

      // Configure with API key
      await gradingManager.aiScorer.configure({
        api: {
          key: 'invalid-key',
          type: 'openai'
        }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Student answer',
        question: 'Test question'
      };

      await expect(gradingManager.scoreAnswer(params))
        .rejects.toThrow('AI评分失败');

      expect(global.toastNotifier.error).toHaveBeenCalled();
    });
  });

  describe('Batch Grading Workflow', () => {
    test('should process multiple answers efficiently', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              totalScore: Math.floor(Math.random() * 40) + 60, // 60-100
              maxScore: 100,
              confidence: 0.9,
              dimensions: {
                accuracy: { score: 85, maxScore: 100 },
                completeness: { score: 80, maxScore: 100 }
              },
              feedback: "答案质量良好",
              suggestions: ["继续保持"]
            })
          }
        }]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const answers = [
        {
          rubric: '标准1',
          studentAnswer: '答案1',
          questionId: 'q1'
        },
        {
          rubric: '标准2',
          studentAnswer: '答案2',
          questionId: 'q2'
        },
        {
          rubric: '标准3',
          studentAnswer: '答案3',
          questionId: 'q3'
        }
      ];

      // Perform batch grading
      const results = await gradingManager.batchScore(answers);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);

      results.forEach(result => {
        expect(result.totalScore).toBeGreaterThanOrEqual(60);
        expect(result.totalScore).toBeLessThanOrEqual(100);
        expect(result.maxScore).toBe(100);
        expect(result.confidence).toBe(0.9);
      });
    });
  });

  describe('Progress Tracking', () => {
    test('should track grading progress accurately', async () => {
      await gradingManager.initialize();

      const answers = Array(10).fill(null).map((_, index) => ({
        rubric: `Rubric ${index}`,
        studentAnswer: `Answer ${index}`,
        question: `Question ${index}`
      }));

      // Mock API responses with delay to simulate real processing
      global.fetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    totalScore: 80,
                    maxScore: 100,
                    confidence: 0.9,
                    dimensions: {},
                    feedback: "Good",
                    suggestions: []
                  })
                }
              }]
            })
          }), 100)
        )
      );

      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      // Start batch grading
      const gradingPromise = gradingManager.batchScore(answers);

      // Check progress during grading
      const progress1 = gradingManager.getProgress();
      expect(progress1.total).toBe(10);
      expect(progress1.completed).toBe(0);
      expect(progress1.percentage).toBe(0);

      // Wait for completion
      await gradingPromise;

      // Check final progress
      const finalProgress = gradingManager.getProgress();
      expect(finalProgress.total).toBe(10);
      expect(finalProgress.completed).toBe(10);
      expect(finalProgress.percentage).toBe(100);
    });
  });

  describe('Dual Model Grading', () => {
    test('should perform dual model grading when enabled', async () => {
      const gpt4oResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              totalScore: 85,
              maxScore: 100,
              confidence: 0.9,
              dimensions: {}
            })
          }
        }]
      };

      const geminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                totalScore: 82,
                maxScore: 100,
                confidence: 0.88,
                dimensions: {}
              })
            }]
          }
        }]
      };

      // Mock both API calls
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => gpt4oResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => geminiResponse
        });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Test answer',
        question: 'Test question',
        dualModel: true
      };

      const result = await gradingManager.scoreAnswer(params);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(82);
      expect(result.totalScore).toBeLessThanOrEqual(85);
      expect(result.confidence).toBeGreaterThanOrEqual(0.88);

      // Should show dual model notification
      expect(global.toastNotifier.info).toHaveBeenCalledWith(
        '正在使用双模型交叉验证，请稍候...',
        expect.objectContaining({
          duration: 3000,
          showProgress: true
        })
      );
    });
  });

  describe('Error Recovery', () => {
    test('should handle network failures with retry', async () => {
      let attemptCount = 0;

      global.fetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  totalScore: 75,
                  maxScore: 100,
                  confidence: 0.85
                })
              }
            }]
          })
        });
      });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Test answer',
        question: 'Test question'
      };

      const result = await gradingManager.scoreAnswer(params);

      expect(result.totalScore).toBe(75);
      expect(attemptCount).toBe(3); // Should retry 3 times
    });

    test('should fallback to single model when dual model fails', async () => {
      // Mock dual model failure
      global.fetch
        .mockRejectedValueOnce(new Error('GPT-4o failed'))
        .mockRejectedValueOnce(new Error('Gemini failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  totalScore: 70,
                  maxScore: 100,
                  confidence: 0.8
                })
              }
            }]
          })
        });

      await gradingManager.initialize();
      await gradingManager.aiScorer.configure({
        api: { key: 'test-key', type: 'openai' }
      });

      const params = {
        rubric: 'Test rubric',
        studentAnswer: 'Test answer',
        question: 'Test question',
        dualModel: true
      };

      const result = await gradingManager.scoreAnswer(params);

      expect(result.totalScore).toBe(70);
      expect(global.toastNotifier.warning).toHaveBeenCalledWith(
        '双模型验证失败，使用单模型结果',
        { duration: 3000 }
      );
    });
  });

  describe('Score Synchronization', () => {
    test('should sync scores to external system', async () => {
      const mockScores = [
        { studentId: 'student1', score: 85, questionId: 'q1' },
        { studentId: 'student2', score: 92, questionId: 'q2' },
        { studentId: 'student3', score: 78, questionId: 'q3' }
      ];

      await gradingManager.initialize();

      // Mock the sync engine
      gradingManager.scoreSyncEngine.sync = jest.fn().mockResolvedValue({
        success: true,
        syncedCount: 3,
        errors: []
      });

      const result = await gradingManager.syncScores(mockScores);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(3);
      expect(gradingManager.scoreSyncEngine.sync).toHaveBeenCalledWith(mockScores);
    });
  });
});
