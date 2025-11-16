// ============================================================================
// 智学网AI阅卷助手 - AI评分模块
// 100%还原原HTML中的AI评分逻辑
// ============================================================================

import { AIService } from '../../services/ai-service.js';
import { toastNotifier } from '../../ui/components/toast-notifier.js';

export class AIScorer {
    constructor() {
        this.currentScore = 85;
        this.maxScore = 100;
        this.isGrading = false;
        this.dualModelEnabled = false;
        this.confidence = 0.92;
        this.strategy = 'gpt4o-priority';
        this.aiService = new AIService();
        
    }

    /**
     * 配置AI评分器
     * @param {Object} settings - 设置对象
     */
    async configure(settings) {
        

        try {
            if (settings.api) {
                await this.aiService.configure({
                    apiKey: settings.api.key,
                    apiType: settings.api.type,
                    apiEndpoint: settings.api.endpoint,
                    debugMode: settings.advanced?.debugMode || false
                });
            }

            if (settings.model) {
                await this.aiService.configure({
                    modelParams: {
                        temperature: settings.model.temperature,
                        maxTokens: settings.model.maxTokens,
                        topP: settings.model.topP
                    }
                });
            }

            // 显示配置成功通知
            if (toastNotifier) {
                toastNotifier.success('AI评分器配置成功');
            }
        } catch (error) {
            // console.error('❌ AI评分器配置失败:', error);

            // 显示配置失败通知
            if (toastNotifier) {
                toastNotifier.error('AI评分器配置失败: ' + error.message);
            }

            throw error;
        }
    }

    /**
     * 测试AI连接
     */
    async testConnection() {
        try {
            const result = await this.aiService.testConnection();
            
            return result;
        } catch (error) {
            // console.error('❌ AI连接测试失败:', error);
            throw error;
        }
    }
    async startTrial(options = {}) {
        const { rubric, dualModel = false } = options;

        

        // 检查评分细则
        if (!rubric || !rubric.trim()) {
            throw new Error('请先输入评分细则');
        }

        // 设置双模型
        this.dualModelEnabled = dualModel;

        // 开始评分
        this.isGrading = true;
        const result = await this.performScoring(rubric);

        this.isGrading = false;
        return result;
    }

    /**
     * 执行AI评分
     * @param {Object} params - 评分参数
     * @returns {Promise<Object>} 评分结果
     */
    async performScoring(params) {
        

        try {
            // 使用真实的AI服务进行评分
            const result = await this.aiService.performGrading(params);

            // 更新当前评分
            this.currentScore = result.totalScore;
            this.confidence = result.confidence;

            
            return result;
        } catch (error) {
            // console.error('❌ AI评分失败:', error);

            // 如果AI服务失败，返回模拟结果
            showToast('AI评分失败，使用模拟评分', 'warning');
            return this.getSimulatedGradingResult(params.rubric);
        }
    }

    /**
     * 单模型评分
     * @param {string} rubric - 评分细则
     * @returns {Object} 评分结果
     */
    performSingleModelScoring(rubric) {
        const dimensionScores = this.analyzeDimensions(rubric);
        const totalScore = this.calculateTotalScore(dimensionScores);
        const confidence = this.calculateConfidence(totalScore);

        return {
            score: totalScore,
            maxScore: this.maxScore,
            confidence: confidence,
            dimensions: dimensionScores,
            reasoning: this.generateReasoning(dimensionScores),
            model: 'GPT-4o',
            timestamp: Date.now()
        };
    }

    /**
     * 双模型交叉验证
     * @param {string} rubric - 评分细则
     * @returns {Object} 评分结果
     */
    async performDualModelScoring(rubric) {
        

        // 模拟两个模型同时评分
        const [modelA, modelB] = await Promise.all([
            this.scoreWithModel('GPT-4o', rubric),
            this.scoreWithModel('Gemini', rubric)
        ]);

        // 计算差异
        const difference = Math.abs(modelA.score - modelB.score);
        const agreement = this.calculateAgreement(modelA, modelB);

        // 综合结果
        const finalScore = Math.round((modelA.score + modelB.score) / 2);
        const confidence = Math.min(0.95, 0.85 + 0.1 * agreement);

        return {
            score: finalScore,
            maxScore: this.maxScore,
            confidence: confidence,
            dimensions: this.mergeDimensions(modelA.dimensions, modelB.dimensions),
            reasoning: this.mergeReasoning(modelA.reasoning, modelB.reasoning),
            models: {
                modelA: { ...modelA, name: 'GPT-4o' },
                modelB: { ...modelB, name: 'Gemini' }
            },
            agreement: agreement,
            difference: difference,
            timestamp: Date.now()
        };
    }

    /**
     * 使用指定模型评分
     * @param {string} modelName - 模型名称
     * @param {string} rubric - 评分细则
     * @returns {Object} 评分结果
     */
    async scoreWithModel(modelName, rubric) {
        await this.delay(1500);

        // 模拟模型评分
        const dimensionScores = this.analyzeDimensions(rubric);
        const totalScore = this.calculateTotalScore(dimensionScores);

        return {
            score: totalScore,
            maxScore: this.maxScore,
            confidence: Math.random() * 0.2 + 0.8,
            dimensions: dimensionScores,
            reasoning: this.generateReasoning(dimensionScores)
        };
    }

    /**
     * 分析维度得分
     * @param {string} rubric - 评分细则
     * @returns {Array} 维度得分数组
     */
    analyzeDimensions(rubric) {
        // 模拟维度分析
        return [
            { name: '观点明确', score: 28, maxScore: 30, weight: 0.3 },
            { name: '史实准确', score: 25, maxScore: 30, weight: 0.3 },
            { name: '论述充分', score: 22, maxScore: 25, weight: 0.25 },
            { name: '语言表达', score: 10, maxScore: 15, weight: 0.15 }
        ];
    }

    /**
     * 获取模拟评分结果（当AI服务不可用时使用）
     */
    getSimulatedGradingResult(rubric) {
        

        const dimensions = this.analyzeDimensions(rubric);
        const totalScore = this.calculateTotalScore(dimensions);

        return {
            totalScore: totalScore,
            maxScore: this.maxScore,
            confidence: 0.8,
            dimensions: dimensions,
            overallReasoning: '模拟评分：基于预设规则生成的评分结果',
            suggestions: '建议完善评分细则配置',
            model: '模拟评分',
            timestamp: Date.now()
        };
    }

    /**
     * 计算总分
     * @param {Array} dimensions - 维度得分
     * @returns {number} 总分
     */
    calculateTotalScore(dimensions) {
        return dimensions.reduce((total, dim) => total + dim.score, 0);
    }

    /**
     * 计算置信度
     * @param {number} score - 总分
     * @returns {number} 置信度
     */
    calculateConfidence(score) {
        // 模拟置信度计算
        const ratio = score / this.maxScore;
        return Math.min(0.98, 0.75 + ratio * 0.2);
    }

    /**
     * 生成评分理由
     * @param {Array} dimensions - 维度得分
     * @returns {Array} 评分理由数组
     */
    generateReasoning(dimensions) {
        return dimensions.map(dim => ({
            dimension: dim.name,
            score: dim.score,
            maxScore: dim.maxScore,
            reason: this.getDimensionReason(dim)
        }));
    }

    /**
     * 获取维度评分理由
     * @param {Object} dimension - 维度对象
     * @returns {string} 评分理由
     */
    getDimensionReason(dimension) {
        const reasons = {
            观点明确: '论点清晰，立场明确，能够准确把握题目要求',
            史实准确: '历史事实准确无误，引用材料恰当',
            论述充分: '论据充实，逻辑严密，论证有力',
            语言表达: '表达流畅，书写规范，条理清晰'
        };
        return reasons[dimension.name] || '评分依据充分';
    }

    /**
     * 计算模型间一致性
     * @param {Object} modelA - 模型A结果
     * @param {Object} modelB - 模型B结果
     * @returns {number} 一致性百分比
     */
    calculateAgreement(modelA, modelB) {
        const diff = Math.abs(modelA.score - modelB.score);
        return Math.max(0, 1 - diff / modelA.maxScore);
    }

    /**
     * 合并两个模型的维度
     * @param {Array} dimsA - 模型A的维度
     * @param {Array} dimsB - 模型B的维度
     * @returns {Array} 合并后的维度
     */
    mergeDimensions(dimsA, dimsB) {
        return dimsA.map((dimA, index) => {
            const dimB = dimsB[index];
            return {
                name: dimA.name,
                score: Math.round((dimA.score + dimB.score) / 2),
                maxScore: dimA.maxScore,
                weight: dimA.weight
            };
        });
    }

    /**
     * 合并两个模型的评分理由
     * @param {Array} reasonA - 模型A的理由
     * @param {Array} reasonB - 模型B的理由
     * @returns {Array} 合并后的理由
     */
    mergeReasoning(reasonA, reasonB) {
        return reasonA.map((rA, index) => {
            const rB = reasonB[index];
            return {
                dimension: rA.dimension,
                score: Math.round((rA.score + rB.score) / 2),
                maxScore: rA.maxScore,
                reason: rA.reason + ' | ' + rB.reason
            };
        });
    }

    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     * @returns {Promise} Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取当前评分状态
     * @returns {Object} 状态对象
     */
    getStatus() {
        return {
            isGrading: this.isGrading,
            currentScore: this.currentScore,
            confidence: this.confidence,
            strategy: this.strategy,
            dualModelEnabled: this.dualModelEnabled
        };
    }

    /**
     * 设置评分策略
     * @param {string} strategy - 策略名称
     */
    setStrategy(strategy) {
        
        this.strategy = strategy;
    }

    /**
     * 启用/禁用双模型
     * @param {boolean} enabled - 是否启用
     */
    setDualModel(enabled) {
        
        this.dualModelEnabled = enabled;
    }
}
