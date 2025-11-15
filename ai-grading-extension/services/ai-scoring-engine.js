/**
 * AI评分引擎
 * AI Scoring Engine - 负责生成评分细则和调用AI模型进行视觉识别评分
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { Logger } from '../utils/logger.js';
import { AIService } from './ai-service.js';

export class AIScoringEngine extends EventEmitter {
    constructor() {
        super();
        this.logger = new Logger('AIScoringEngine');
        this.aiService = AIService();
        this.isInitialized = false;

        // 评分维度模板
        this.scoringDimensions = {
            subjective: {
                content_completeness: {
                    name: '内容完整性',
                    description: '答案是否完整回答了题目要求的所有要点',
                    maxScore: 20,
                    weight: 0.25
                },
                logical_structure: {
                    name: '逻辑结构',
                    description: '答案的条理性和逻辑性是否清晰',
                    maxScore: 20,
                    weight: 0.20
                },
                language_expression: {
                    name: '语言表达',
                    description: '语言是否准确、流畅、规范',
                    maxScore: 20,
                    weight: 0.20
                },
                innovation_thinking: {
                    name: '创新思维',
                    description: '是否有独特的见解或创新性的思考',
                    maxScore: 20,
                    weight: 0.15
                },
                format_standard: {
                    name: '格式规范',
                    description: '书写是否规范,格式是否正确',
                    maxScore: 20,
                    weight: 0.20
                }
            },
            objective: {
                answer_correctness: {
                    name: '答案正确性',
                    description: '答案是否正确',
                    maxScore: 60,
                    weight: 0.6
                },
                step_completeness: {
                    name: '步骤完整性',
                    description: '解题步骤是否完整',
                    maxScore: 25,
                    weight: 0.25
                },
                process_standard: {
                    name: '过程规范性',
                    description: '解题过程是否规范',
                    maxScore: 15,
                    weight: 0.15
                }
            }
        };
    }

    /**
     * 初始化评分引擎
     */
    async init() {
        this.logger.info('初始化AI评分引擎');

        try {
            await this.aiService.init();
            this.isInitialized = true;
            this.logger.info('AI评分引擎初始化完成');
            this.emit('engine-initialized');
        } catch (error) {
            this.logger.error('评分引擎初始化失败', error);
            this.emit('engine-error', { error: error.message });
            throw error;
        }
    }

    /**
     * 生成评分细则
     */
    async generateScoringRubric(question, referenceAnswer, questionType = 'subjective') {
        this.logger.info('生成评分细则', { questionType, questionLength: question.length });

        try {
            // 分析题目类型和难度
            const analysisPrompt = this.buildAnalysisPrompt(question, referenceAnswer);

            const analysisResult = await this.aiService.sendMessage({
                model: 'gpt-4',
                message: analysisPrompt,
                temperature: 0.3,
                maxTokens: 800
            });

            // 解析分析结果
            const analysis = this.parseAnalysisResult(analysisResult);

            // 基于分析结果生成评分细则
            const rubric = this.buildScoringRubric(analysis, questionType);

            this.logger.info('评分细则生成完成', {
                dimensions: rubric.dimensions.length,
                totalScore: rubric.totalScore,
                difficulty: analysis.difficulty
            });

            this.emit('rubric-generated', { rubric, analysis });
            return rubric;

        } catch (error) {
            this.logger.error('评分细则生成失败', error);
            this.emit('rubric-error', { error: error.message });

            // 返回默认评分细则
            return this.getDefaultRubric(questionType);
        }
    }

    /**
     * 构建分析提示词
     */
    buildAnalysisPrompt(question, referenceAnswer) {
        return `
请作为一位经验丰富的出题专家,分析以下题目和参考答案,并提供详细的分析报告.

**题目内容:**
${question}

**参考答案:**
${referenceAnswer}

**请提供以下分析:**

1. **题目类型识别**:判断这是主观题还是客观题,并说明具体类型
2. **难度等级评估**:从1-10评估题目难度,并说明理由
3. **核心考察点**:列出题目主要考察的知识点和能力
4. **评分关键点**:基于参考答案,列出评分时必须关注的关键点
5. **常见错误类型**:预测学生可能犯的错误类型
6. **评分维度建议**:建议的评分维度和权重分配

        const prompt = `
请仔细分析以下题目,并提供详细的评分细则:

**题目内容:**
{questionContent}

**参考答案:**
{referenceAnswer}

请从以下几个维度进行分析:
1. **题目类型与难度**:判断题目类型和难度等级(1-10)
2. **核心考察点**:列出题目主要考察的知识点和能力
3. **评分关键点**:基于参考答案,列出评分时必须关注的关键点
4. **常见错误类型**:预测学生可能犯的错误类型
5. **评分维度建议**:建议的评分维度和权重分配

**输出格式:**
请确保分析准确、全面,为后续自动评分提供可靠依据.
        `.trim();
    }

    /**
     * 解析分析结果
     */
    parseAnalysisResult(result) {
        try {
            // 尝试从结果中提取JSON
            const jsonMatch = result.content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }

            // 如果没有JSON格式,尝试解析文本
            return this.parseTextAnalysis(result.content);
        } catch (error) {
            this.logger.warn('分析结果解析失败,使用默认分析', error);
            return this.getDefaultAnalysis();
        }
    }

    /**
     * 解析文本格式的分析结果
     */
    parseTextAnalysis(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        const analysis = {
            questionType: 'subjective',
            difficulty: 5,
            keyPoints: [],
            commonErrors: [],
            scoringDimensions: [],
            analysis: text
        };

        // 简单的关键词提取
        lines.forEach(line => {
            if (line.includes('难度') && line.includes(':')) {
                const difficulty = line.match(/(\d+)/);
                if (difficulty) {
                    analysis.difficulty = parseInt(difficulty[1]);
                }
            }

            if (line.includes('要点') || line.includes('关键点')) {
                const points = line.split(':')[1]?.split('、') || [];
                analysis.keyPoints.push(...points.map(p => p.trim()).filter(p => p));
            }

            if (line.includes('错误')) {
                const errors = line.split(':')[1]?.split('、') || [];
                analysis.commonErrors.push(...errors.map(e => e.trim()).filter(e => e));
            }
        });

        return analysis;
    }

    /**
     * 构建评分细则
     */
    buildScoringRubric(analysis, questionType) {
        const dimensions = this.scoringDimensions[questionType] || this.scoringDimensions.subjective;

        // 根据分析结果调整评分维度
        const adjustedDimensions = Object.keys(dimensions).map(key => {
            const dimension = { ...dimensions[key] };

            // 根据难度调整权重
            if (analysis.difficulty >= 8) {
                if (key === 'innovation_thinking') {
                    dimension.weight += 0.05;
                } else if (key === 'content_completeness') {
                    dimension.weight += 0.03;
                }
            }

            // 根据关键点调整维度描述
            if (analysis.keyPoints.length > 0) {
                dimension.keyPoints = analysis.keyPoints;
            }

            return dimension;
        });

        const totalScore = adjustedDimensions.reduce((sum, dim) => sum + dim.maxScore, 0);

        return {
            questionType,
            difficulty: analysis.difficulty,
            dimensions: adjustedDimensions,
            totalScore,
            analysis: analysis.analysis,
            keyPoints: analysis.keyPoints,
            commonErrors: analysis.commonErrors,
            generatedAt: Date().toISOString()
        };
    }

    /**
     * 分析答题卡图片并评分
     */
    async analyzeAnswerCard(imageDataUrl, scoringRubric, studentInfo = {}) {
        this.logger.info('开始分析答题卡图片', {
            dimensions: scoringRubric.dimensions.length,
            totalScore: scoringRubric.totalScore,
            studentInfo
        });

        try {
            // 构建评分提示词
            const scoringPrompt = this.buildScoringPrompt(scoringRubric, studentInfo);

            // 准备AI请求
            const aiRequest = {
                model: 'gpt-4-vision-preview', // 使用支持视觉的模型
                message: scoringPrompt,
                images: [{
                    data: imageDataUrl,
                    mimeType: 'image/png'
                }],
                temperature: 0.3, // 较低的温度以获得更稳定的评分
                maxTokens: 1500,
                detail: 'high' // 高质量图像分析
            };

            this.logger.debug('发送AI评分请求', {
                model: aiRequest.model,
                promptLength: scoringPrompt.length,
                imageSize: imageDataUrl.length
            });

            // 发送评分请求
            const startTime = Date.now();
            const result = await this.aiService.sendMessage(aiRequest);
            const scoringTime = Date.now() - startTime;

            // 解析评分结果
            const scoringResult = this.parseScoringResult(result, scoringRubric);
            scoringResult.scoringTime = Math.round(scoringTime / 1000);
            scoringResult.aiModel = aiRequest.model;

            this.logger.info('答题卡分析完成', {
                totalScore: scoringResult.totalScore,
                confidence: scoringResult.confidence,
                scoringTime: scoringResult.scoringTime,
                dimensions: scoringResult.breakdown.length
            });

            this.emit('scoring-completed', {
                result: scoringResult,
                studentInfo,
                scoringTime: scoringResult.scoringTime
            });

            return scoringResult;

        } catch (error) {
            this.logger.error('答题卡分析失败', error);
            this.emit('scoring-error', {
                error: error.message,
                studentInfo
            });

            // 返回错误结果,触发人工复核
            return this.createErrorResult(error.message, scoringRubric);
        }
    }

    /**
     * 构建评分提示词
     */
    buildScoringPrompt(scoringRubric, studentInfo) {
        const dimensionsText = scoringRubric.dimensions.map(dim =>
            `- ${dim.name} (${dim.maxScore}分): ${dim.description}`
        ).join('\n');

        const keyPointsText = scoringRubric.keyPoints && scoringRubric.keyPoints.length > 0
            ? `\n**评分关键点:**\n${scoringRubric.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}`
            : '';

        const studentInfoText = studentInfo.name
            ? `\n**学生信息:**${studentInfo.name} (${studentInfo.id || '未知'})`
            : '';

        return `
您是一位经验丰富的阅卷老师,请根据以下评分标准,对提供的答题卡图片进行客观、准确的评分.

**评分标准:**
${dimensionsText}

${keyPointsText}

${studentInfoText}

**评分要求:**
1. 严格按照评分标准进行评分,确保公平公正
2. 对每个评分维度给出具体的分数和详细的评分理由
3. 如果答案中包含关键得分点,请明确指出
4. 如果存在明显错误或遗漏,也请详细说明
5. 评估您对这次评分的置信度（0-100%）
6. 提供具体的改进建议

**输出格式（必须严格按照JSON格式）:**
```json
{
  "totalScore": 总分,
  "confidence": 置信度(0-100),
  "breakdown": [
    {
      "dimension": "维度名称",
      "score": 该维度得分,
      "maxScore": 该维度满分,
      "reason": "评分理由",
      "highlights": ["亮点1", "亮点2"]
    }
  ],
  "feedback": "总体评价和改进建议",
  "tags": ["标签1", "标签2"],
  "issues": ["问题1", "问题2"]
}
```

**重要提醒:**
- 请仔细查看图片中的手写内容
- 注意识别可能的涂改和修正
- 对于模糊不清的部分,请在issues中说明
- 保持评分的客观性和一致性

请开始评分:
        `.trim();
    }

    /**
     * 解析评分结果
     */
    parseScoringResult(result, scoringRubric) {
        try {
            // 尝试从结果中提取JSON
            const jsonMatch = result.content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return this.validateScoringResult(parsed, scoringRubric);
            }

            // 如果没有JSON格式,尝试解析文本
            return this.parseTextScoringResult(result.content, scoringRubric);

        } catch (error) {
            this.logger.warn('评分结果解析失败,使用默认结果', error);
            return this.createDefaultScoringResult(scoringRubric);
        }
    }

    /**
     * 验证评分结果
     */
    validateScoringResult(result, scoringRubric) {
        // 验证总分
        const expectedTotal = scoringRubric.totalScore;
        const actualTotal = result.totalScore || 0;

        if (actualTotal < 0 || actualTotal > expectedTotal) {
            this.logger.warn('评分结果总分异常', { actualTotal, expectedTotal });
            result.totalScore = Math.max(0, Math.min(actualTotal, expectedTotal));
        }

        // 验证置信度
        const confidence = result.confidence || 0;
        result.confidence = Math.max(0, Math.min(confidence, 100));

        // 验证评分维度
        if (!result.breakdown || !Array.isArray(result.breakdown)) {
            result.breakdown = this.createDefaultBreakdown(scoringRubric);
        }

        // 确保所有维度都有分数
        scoringRubric.dimensions.forEach(dimension => {
            const breakdownItem = result.breakdown.find(item =>
                item.dimension === dimension.name
            );

            if (!breakdownItem) {
                result.breakdown.push({
                    dimension: dimension.name,
                    score: 0,
                    maxScore: dimension.maxScore,
                    reason: '该维度未检测到有效内容',
                    highlights: []
                });
            }
        });

        return result;
    }

    /**
     * 解析文本格式的评分结果
     */
    parseTextScoringResult(text, scoringRubric) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        const result = {
            totalScore: 0,
            confidence: 70,
            breakdown: [],
            feedback: text,
            tags: [],
            issues: []
        };

        // 提取总分
        const totalScoreMatch = text.match(/(\d+)分/);
        if (totalScoreMatch) {
            result.totalScore = parseInt(totalScoreMatch[1]);
        }

        // 提取置信度
        const confidenceMatch = text.match(/置信度[::]\s*(\d+)%?/);
        if (confidenceMatch) {
            result.confidence = parseInt(confidenceMatch[1]);
        }

        // 为每个维度创建评分项
        scoringRubric.dimensions.forEach(dimension => {
            const dimensionText = lines.find(line =>
                line.includes(dimension.name)
            );

            let score = 0;
            let reason = '未检测到该维度的具体评分';

            if (dimensionText) {
                const scoreMatch = dimensionText.match(/(\d+)分/);
                if (scoreMatch) {
                    score = parseInt(scoreMatch[1]);
                }
                reason = dimensionText;
            }

            result.breakdown.push({
                dimension: dimension.name,
                score: Math.min(score, dimension.maxScore),
                maxScore: dimension.maxScore,
                reason: reason,
                highlights: []
            });
        });

        return result;
    }

    /**
     * 创建错误结果
     */
    createErrorResult(errorMessage, scoringRubric) {
        return {
            totalScore: 0,
            confidence: 0,
            breakdown: scoringRubric.dimensions.map(dim => ({
                dimension: dim.name,
                score: 0,
                maxScore: dim.maxScore,
                reason: `识别失败: ${errorMessage}`,
                highlights: []
            })),
            feedback: `AI识别过程中出现错误: ${errorMessage}.建议转入人工复核流程.`,
            tags: ['识别失败', '需要人工复核'],
            issues: [errorMessage],
            error: true,
            aiModel: 'unknown'
        };
    }

    /**
     * 创建默认评分结果
     */
    createDefaultScoringResult(scoringRubric) {
        const avgScore = Math.round(scoringRubric.totalScore * 0.6);

        return {
            totalScore: avgScore,
            confidence: 50,
            breakdown: scoringRubric.dimensions.map(dim => ({
                dimension: dim.name,
                score: Math.round(dim.maxScore * 0.6),
                maxScore: dim.maxScore,
                reason: '默认评分:中等水平表现',
                highlights: []
            })),
            feedback: '由于AI识别失败,使用默认评分.建议人工复核确认.',
            tags: ['默认评分', '需要复核'],
            issues: ['AI识别异常'],
            aiModel: 'default'
        };
    }

    /**
     * 创建默认评分明细
     */
    createDefaultBreakdown(scoringRubric) {
        return scoringRubric.dimensions.map(dim => ({
            dimension: dim.name,
            score: Math.round(dim.maxScore * 0.5),
            maxScore: dim.maxScore,
            reason: '默认评分:中等表现',
            highlights: []
        }));
    }

    /**
     * 获取默认评分细则
     */
    getDefaultRubric(questionType = 'subjective') {
        const dimensions = this.scoringDimensions[questionType] || this.scoringDimensions.subjective;
        const totalScore = Object.values(dimensions).reduce((sum, dim) => sum + dim.maxScore, 0);

        return {
            questionType,
            difficulty: 5,
            dimensions: Object.values(dimensions),
            totalScore,
            analysis: '默认评分细则',
            keyPoints: [],
            commonErrors: [],
            generatedAt: Date().toISOString()
        };
    }

    /**
     * 获取默认分析结果
     */
    getDefaultAnalysis() {
        return {
            questionType: 'subjective',
            difficulty: 5,
            keyPoints: ['内容完整性', '逻辑清晰性', '语言表达'],
            commonErrors: ['内容不完整', '逻辑混乱', '表达不清'],
            scoringDimensions: [
                { name: '内容完整性', weight: 0.3, description: '内容是否完整' },
                { name: '逻辑清晰性', weight: 0.3, description: '逻辑是否清晰' },
                { name: '语言表达', weight: 0.4, description: '表达是否准确' }
            ],
            analysis: '默认分析结果'
        };
    }

    /**
     * 评估评分质量
     */
    evaluateScoringQuality(scoringResult) {
        const quality = {
            score: 0,
            issues: [],
            recommendations: []
        };

        // 检查置信度
        if (scoringResult.confidence < 60) {
            quality.issues.push('置信度较低,建议人工复核');
            quality.recommendations.push('转入人工复核流程');
        }

        // 检查评分分布
        const breakdown = scoringResult.breakdown;
        if (breakdown) {
            const zeroScores = breakdown.filter(item => item.score === 0).length;
            if (zeroScores > breakdown.length * 0.5) {
                quality.issues.push('过多维度得分为0,可能存在识别问题');
                quality.recommendations.push('检查图片质量或转入人工复核');
            }

            const fullScores = breakdown.filter(item =>
                item.score === item.maxScore
            ).length;
            if (fullScores === breakdown.length) {
                quality.issues.push('所有维度均为满分,需要验证');
                quality.recommendations.push('建议人工确认评分合理性');
            }
        }

        // 检查错误标记
        if (scoringResult.error) {
            quality.issues.push('评分过程出现错误');
            quality.recommendations.push('必须转入人工复核');
        }

        // 计算质量分数
        quality.score = Math.max(0, 100 - quality.issues.length * 20);

        this.emit('quality-evaluated', quality);
        return quality;
    }

    /**
     * 获取引擎状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            availableModels: this.aiService.getAvailableModels(),
            currentModel: this.aiService.getCurrentModel()
        };
    }

    /**
     * 销毁引擎
     */
    async destroy() {
        this.logger.info('销毁AI评分引擎');

        if (this.aiService) {
            await this.aiService.destroy();
        }

        this.isInitialized = false;
        this.emit('engine-destroyed');
    }
}

export { AIScoringEngine };
