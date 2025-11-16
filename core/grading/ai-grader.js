/**
 * AI Grading Engine
 * AI评分引擎 - 处理OCR结果并生成智能评分
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { AIService } from '../../services/ai-service.js';
import { validateData } from '../../utils/security-utils.js';

export class AIGrader extends EventEmitter {
    constructor() {
        super();
        this.aiService = new AIService();
        this.gradingRubric = null;
        this.isGrading = false;
        this.gradingResults = new Map();
        this.confidenceThreshold = 0.8;
        this.dualModelValidation = false;
        
    }

    /**
     * 配置评分引擎
     */
    async configure(config) {
        try {
            // 配置AI服务
            await this.aiService.configure({
                apiKey: config.apiKey,
                apiType: config.apiType || 'openai',
                modelParams: config.modelParams || {
                    temperature: 0.3, // 降低温度以提高一致性
                    maxTokens: 2048
                }
            });

            this.confidenceThreshold = config.confidenceThreshold || 0.8;
            this.dualModelValidation = config.dualModelValidation || false;
            this.gradingRubric = config.gradingRubric || this.getDefaultRubric();

            

        } catch (error) {
            // console.error('❌ AI评分引擎配置失败:', error);
            throw error;
        }
    }

    /**
     * 执行AI评分
     */
    async gradeAnswer(studentAnswer, questionData, options = {}) {
        try {
            this.isGrading = true;
            this.emit('grading-start', { studentAnswer, questionData });

            // 验证输入数据
            const validation = this.validateGradingInput(studentAnswer, questionData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // 构建评分提示
            const gradingPrompt = this.buildGradingPrompt(studentAnswer, questionData);

            // 执行AI评分
            let gradingResult;

            if (this.dualModelValidation) {
                gradingResult = await this.performDualModelGrading(gradingPrompt);
            } else {
                gradingResult = await this.performSingleGrading(gradingPrompt);
            }

            // 验证评分结果
            const resultValidation = this.validateGradingResult(gradingResult);
            if (!resultValidation.valid) {
                throw new Error(resultValidation.error);
            }

            // 应用评分规则
            const finalResult = this.applyGradingRules(gradingResult, questionData);

            // 存储结果
            this.gradingResults.set(questionData.id, finalResult);

            this.emit('grading-complete', {
                result: finalResult,
                questionId: questionData.id
            });

            return finalResult;

        } catch (error) {
            // console.error('AI评分失败:', error);
            this.emit('grading-error', { error, questionId: questionData.id });
            throw error;
        } finally {
            this.isGrading = false;
        }
    }

    /**
     * 批量评分
     */
    async gradeAnswers(answers, questions, options = {}) {
        const results = [];

        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i];
            const question = questions[i];

            try {
                this.emit('batch-progress', {
                    current: i + 1,
                    total: answers.length,
                    questionId: question.id
                });

                const result = await this.gradeAnswer(answer, question, options);
                results.push({
                    questionId: question.id,
                    success: true,
                    result: result
                });

            } catch (error) {
                results.push({
                    questionId: question.id,
                    success: false,
                    error: error.message
                });
            }
        }

        this.emit('batch-complete', { results, total: answers.length });
        return results;
    }

    /**
     * 验证评分输入
     */
    validateGradingInput(studentAnswer, questionData) {
        if (!studentAnswer || !studentAnswer.text) {
            return { valid: false, error: '学生答案不能为空' };
        }

        if (!questionData || !questionData.id) {
            return { valid: false, error: '题目数据不能为空' };
        }

        if (!questionData.standardAnswer) {
            return { valid: false, error: '标准答案不能为空' };
        }

        if (!questionData.totalScore || questionData.totalScore <= 0) {
            return { valid: false, error: '题目总分必须大于0' };
        }

        return { valid: true };
    }

    /**
     * 构建评分提示
     */
    buildGradingPrompt(studentAnswer, questionData) {
        const { text: studentText, structure } = studentAnswer;
        const { standardAnswer, totalScore, questionType, gradingPoints } = questionData;

        const prompt = `你是一个专业的数学阅卷老师。请根据以下标准对学生的答案进行评分。

题目信息：
- 总分：${totalScore}分
- 标准答案：${standardAnswer}
- 题目类型：${questionType || '解答题'}

评分要求：
${this.buildGradingCriteria(gradingPoints, totalScore)}

学生答案：
${studentText}

请按以下JSON格式返回评分结果：
{
  "score": 0-${totalScore},
  "confidence": 0.0-1.0,
  "feedback": "详细的评分反馈",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "gradingDetails": [
    {
      "criterion": "评分点1",
      "score": 分数,
      "feedback": "该评分点评语"
    }
  ]
}

评分标准：
1. 答案正确性（40%）：最终答案是否正确
2. 解题过程（30%）：步骤是否完整、逻辑是否清晰
3. 数学表达（20%）：符号使用、格式规范
4. 创新性（10%）：是否有独特的解题思路

请严格按照JSON格式返回，不要包含任何其他文本。`;

        return prompt;
    }

    /**
     * 构建评分标准
     */
    buildGradingCriteria(gradingPoints, totalScore) {
        if (!gradingPoints || gradingPoints.length === 0) {
            return `根据标准答案，正确解答得${totalScore}分，部分正确按比例给分。`;
        }

        return gradingPoints.map((point, index) => {
            return `${index + 1}. ${point.description} (${point.score}分)`;
        }).join('\n');
    }

    /**
     * 执行单次评分
     */
    async performSingleGrading(prompt) {
        try {
            const response = await this.aiService.chat([{
                role: 'user',
                content: prompt
            }], {
                temperature: 0.3,
                maxTokens: 1500
            });

            const aiResponse = response.choices[0].message.content;

            // 解析JSON响应
            const gradingResult = this.parseGradingResponse(aiResponse);

            return {
                ...gradingResult,
                model: this.aiService.apiType,
                timestamp: Date.now()
            };

        } catch (error) {
            // console.error('单次评分失败:', error);
            throw new Error('AI评分调用失败: ' + error.message);
        }
    }

    /**
     * 执行双模型评分（用于验证）
     */
    async performDualModelGrading(prompt) {
        try {
            // 第一次评分（主模型）
            const primaryResult = await this.performSingleGrading(prompt);

            // 第二次评分（验证模型）
            const secondaryPrompt = prompt + '\n\n请独立评分，不要受任何其他评分影响。';

            // 临时切换模型
            const originalApiType = this.aiService.apiType;
            const secondaryApiType = originalApiType === 'openai' ? 'gemini' : 'openai';

            this.aiService.apiType = secondaryApiType;
            const secondaryResult = await this.performSingleGrading(secondaryPrompt);

            // 恢复原始模型
            this.aiService.apiType = originalApiType;

            // 比较两个结果
            const comparison = this.compareGradingResults(primaryResult, secondaryResult);

            return {
                primary: primaryResult,
                secondary: secondaryResult,
                comparison: comparison,
                finalScore: comparison.consensusScore,
                confidence: comparison.confidence,
                timestamp: Date.now()
            };

        } catch (error) {
            // console.error('双模型评分失败:', error);
            // 降级到单次评分
            return await this.performSingleGrading(prompt);
        }
    }

    /**
     * 解析评分响应
     */
    parseGradingResponse(response) {
        try {
            // 尝试提取JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // 如果无法提取JSON，返回错误
            throw new Error('无法解析AI响应中的JSON数据');

        } catch (error) {
            // console.error('解析评分响应失败:', error);
            throw new Error('AI响应格式错误: ' + error.message);
        }
    }

    /**
     * 比较两个评分结果
     */
    compareGradingResults(primary, secondary) {
        const scoreDiff = Math.abs(primary.score - secondary.score);
        const confidenceDiff = Math.abs(primary.confidence - secondary.confidence);

        // 计算共识分数
        const consensusScore = this.calculateConsensusScore(primary.score, secondary.score);

        // 计算置信度
        const confidence = this.calculateConsensusConfidence(primary, secondary);

        return {
            scoreDifference: scoreDiff,
            confidenceDifference: confidenceDiff,
            consensusScore: consensusScore,
            confidence: confidence,
            needsReview: scoreDiff > 2 || confidence < this.confidenceThreshold,
            primary: primary,
            secondary: secondary
        };
    }

    /**
     * 计算共识分数
     */
    calculateConsensusScore(score1, score2) {
        // 如果分数差异很小，取平均值
        if (Math.abs(score1 - score2) <= 1) {
            return Math.round((score1 + score2) / 2);
        }

        // 如果差异较大，取置信度高的分数
        // 这里简化处理，实际应该更复杂的逻辑
        return score1; // 默认使用主模型分数
    }

    /**
     * 计算共识置信度
     */
    calculateConsensusConfidence(primary, secondary) {
        const avgConfidence = (primary.confidence + secondary.confidence) / 2;
        const scoreConsistency = 1 - (Math.abs(primary.score - secondary.score) / 10);

        return Math.min(0.95, (avgConfidence + scoreConsistency) / 2);
    }

    /**
     * 验证评分结果
     */
    validateGradingResult(result) {
        if (!result || typeof result !== 'object') {
            return { valid: false, error: '评分结果格式错误' };
        }

        if (typeof result.score !== 'number' || result.score < 0) {
            return { valid: false, error: '分数必须是大于等于0的数字' };
        }

        if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
            return { valid: false, error: '置信度必须是0-1之间的数字' };
        }

        if (!result.feedback || typeof result.feedback !== 'string') {
            return { valid: false, error: '评分反馈不能为空' };
        }

        return { valid: true };
    }

    /**
     * 应用评分规则
     */
    applyGradingRules(gradingResult, questionData) {
        const { score, confidence, feedback, strengths, weaknesses, suggestions, gradingDetails } = gradingResult;
        const { totalScore, minScore, questionType } = questionData;

        // 确保分数在合理范围内
        const finalScore = Math.max(0, Math.min(totalScore, score));

        // 根据置信度决定是否需要人工复核
        const needsReview = confidence < this.confidenceThreshold;

        // 生成评分等级
        const gradeLevel = this.calculateGradeLevel(finalScore, totalScore);

        return {
            score: finalScore,
            totalScore: totalScore,
            confidence: confidence,
            gradeLevel: gradeLevel,
            needsReview: needsReview,
            feedback: feedback,
            strengths: strengths || [],
            weaknesses: weaknesses || [],
            suggestions: suggestions || [],
            gradingDetails: gradingDetails || [],
            timestamp: Date.now(),
            questionType: questionType,
            aiModel: this.aiService.apiType
        };
    }

    /**
     * 计算评分等级
     */
    calculateGradeLevel(score, totalScore) {
        const percentage = (score / totalScore) * 100;

        if (percentage >= 90) return '优秀';
        if (percentage >= 80) return '良好';
        if (percentage >= 70) return '中等';
        if (percentage >= 60) return '及格';
        return '不及格';
    }

    /**
     * 获取默认评分标准
     */
    getDefaultRubric() {
        return {
            criteria: [
                {
                    name: '答案正确性',
                    weight: 0.4,
                    description: '最终答案是否正确'
                },
                {
                    name: '解题过程',
                    weight: 0.3,
                    description: '步骤是否完整、逻辑是否清晰'
                },
                {
                    name: '数学表达',
                    weight: 0.2,
                    description: '符号使用、格式规范'
                },
                {
                    name: '创新性',
                    weight: 0.1,
                    description: '是否有独特的解题思路'
                }
            ]
        };
    }

    /**
     * 获取评分结果
     */
    getGradingResult(questionId) {
        return this.gradingResults.get(questionId);
    }

    /**
     * 获取所有评分结果
     */
    getAllGradingResults() {
        return Array.from(this.gradingResults.entries()).map(([questionId, result]) => ({
            questionId,
            ...result
        }));
    }

    /**
     * 清除评分结果
     */
    clearGradingResults() {
        this.gradingResults.clear();
        
    }

    /**
     * 获取服务状态
     */
    getStatus() {
        return {
            isGrading: this.isGrading,
            confidenceThreshold: this.confidenceThreshold,
            dualModelValidation: this.dualModelValidation,
            resultsCount: this.gradingResults.size,
            aiServiceStatus: this.aiService.getStatus ? this.aiService.getStatus() : 'unknown'
        };
    }

    /**
     * 销毁服务
     */
    destroy() {
        this.isGrading = false;
        this.clearGradingResults();
        if (this.aiService) {
            this.aiService.destroy();
        }
        this.removeAllListeners();
        
    }
}
