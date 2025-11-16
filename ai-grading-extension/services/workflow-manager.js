/**
 * 工作流管理器
 * Workflow Manager - 负责协调整个AI评分工作流,包括智学网集成、AI评分、异常处理等
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { Logger } from '../utils/logger.js';
import { ZhiXueAdapter } from './zhixue-adapter.js';
import { AIScoringEngine } from './ai-scoring-engine.js';
import { AIService } from './ai-service.js';

export class WorkflowManager extends EventEmitter {
    constructor() {
        super();
        this.logger = new Logger('WorkflowManager');
        this.zhixueAdapter = ZhiXueAdapter();
        this.aiScoringEngine = AIScoringEngine();
        this.aiService = AIService();

        this.workflowState = 'idle'; // idle, detecting, capturing, scoring, syncing, error, review
        this.currentWorkflow = null;
        this.workflowHistory = [];
        this.isProcessing = false;
        this.autoMode = false;

        // 工作流配置
        this.config = {
            confidenceThreshold: 70, // 置信度阈值,低于此值转入人工复核
            maxRetries: 3,
            retryDelay: 1000,
            autoSubmit: true,
            requireConfirmation: false
        };
    }

    /**
     * 初始化工作流管理器
     */
    async init() {
        this.logger.info('初始化工作流管理器');

        try {
            // 初始化AI服务
            await this.aiService.init();

            // 初始化智学网适配器
            await this.zhixueAdapter.init();

            // 初始化AI评分引擎
            await this.aiScoringEngine.init();

            // 绑定事件监听器
            this.bindEvents();

            this.logger.info('工作流管理器初始化完成');
            this.emit('workflow-initialized');
        } catch (error) {
            this.logger.error('工作流管理器初始化失败', error);
            this.emit('workflow-error', { error: error.message });
            throw error;
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 智学网适配器事件
        this.zhixueAdapter.on('elements-detected', (data) => {
            this.handleElementsDetected(data);
        });

        this.zhixueAdapter.on('image-captured', (data) => {
            this.handleImageCaptured(data);
        });

        this.zhixueAdapter.on('score-synced', (data) => {
            this.handleScoreSynced(data);
        });

        // AI评分引擎事件
        this.aiScoringEngine.on('scoring-completed', (data) => {
            this.handleScoringCompleted(data);
        });

        this.aiScoringEngine.on('rubric-generated', (data) => {
            this.handleRubricGenerated(data);
        });
    }

    /**
     * 开始AI评分工作流
     */
    async startGradingWorkflow(options = {}) {
        if (this.isProcessing) {
            this.logger.warn('工作流正在运行中,忽略新的请求');
            return;
        }

        this.logger.info('开始AI评分工作流', options);

        try {
            this.isProcessing = true;
            this.workflowState = 'detecting';

            // 创建工作流实例
            const workflow = this.createWorkflow(options);
            this.currentWorkflow = workflow;

            this.emit('workflow-started', { workflow });

            // 步骤1:检测智学网页面元素
            await this.detectPageElements(workflow);

            // 步骤2:捕捉答题卡图片
            await this.captureAnswerCard(workflow);

            // 步骤3:生成评分细则（如果需要）
            await this.generateScoringRubric(workflow);

            // 步骤4:AI视觉识别评分
            await this.performAIScoring(workflow);

            // 步骤5:处理评分结果
            await this.processScoringResult(workflow);

            this.logger.info('AI评分工作流完成');
            this.emit('workflow-completed', { workflow });
        } catch (error) {
            this.logger.error('工作流执行失败', error);
            await this.handleWorkflowError(error);
        } finally {
            this.isProcessing = false;
            this.workflowState = 'idle';
            this.currentWorkflow = null;
        }
    }

    /**
     * 创建工作流实例
     */
    createWorkflow(options) {
        const workflow = {
            id: this.generateWorkflowId(),
            startTime: Date(),
            status: 'running',
            steps: [],
            results: {},
            errors: [],
            options: { ...this.config, ...options },
            studentInfo: options.studentInfo || {},
            questionInfo: options.questionInfo || {},
            referenceAnswer: options.referenceAnswer || ''
        };

        this.workflowHistory.push(workflow);
        return workflow;
    }

    /**
     * 检测页面元素
     */
    async detectPageElements(workflow) {
        this.logger.info('步骤1:检测智学网页面元素');
        this.workflowState = 'detecting';

        try {
            const step = this.createStep('detect-elements', '检测页面元素');

            // 等待页面加载完成
            await this.waitForPageLoad();

            // 检测页面元素
            const detectedElements = await this.zhixueAdapter.detectPageElements();

            // 验证是否检测到必要的元素
            const requiredElements = ['answerCard', 'scoreInput'];
            const missingElements = requiredElements.filter(type =>
                !this.zhixueAdapter.hasElement(type)
            );

            if (missingElements.length > 0) {
                throw new Error(`未检测到必要元素: ${missingElements.join(', ')}`);
            }

            step.status = 'completed';
            step.result = {
                detectedElements: Object.keys(detectedElements),
                confidence: Math.round(
                    Object.values(detectedElements).reduce((sum, el) => sum + el.confidence, 0) /
                    Object.keys(detectedElements).length * 100
                )
            };

            workflow.steps.push(step);
            workflow.results.detectedElements = detectedElements;

            this.emit('step-completed', { step, workflow });
        } catch (error) {
            await this.handleStepError(workflow, 'detect-elements', error);
        }
    }

    /**
     * 捕捉答题卡图片
     */
    async captureAnswerCard(workflow) {
        this.logger.info('步骤2:捕捉答题卡图片');
        this.workflowState = 'capturing';

        try {
            const step = this.createStep('capture-image', '捕捉答题卡图片');

            // 捕捉答题卡图片
            const imageDataUrl = await this.zhixueAdapter.captureAnswerCard();

            // 验证图片质量
            const imageQuality = this.validateImageQuality(imageDataUrl);

            if (imageQuality.score < 60) {
                this.logger.warn('图片质量较低', imageQuality);
                step.warnings = ['图片质量可能较低,可能影响识别准确性'];
            }

            step.status = 'completed';
            step.result = {
                imageDataUrl,
                quality: imageQuality,
                dimensions: imageQuality.dimensions
            };

            workflow.steps.push(step);
            workflow.results.capturedImage = {
                dataUrl: imageDataUrl,
                quality: imageQuality
            };

            this.emit('step-completed', { step, workflow });
        } catch (error) {
            await this.handleStepError(workflow, 'capture-image', error);
        }
    }

    /**
     * 生成评分细则
     */
    async generateScoringRubric(workflow) {
        this.logger.info('步骤3:生成评分细则');
        this.workflowState = 'generating';

        try {
            const step = this.createStep('generate-rubric', '生成评分细则');

            // 检查是否已有评分细则
            if (workflow.options.scoringRubric) {
                step.status = 'skipped';
                step.result = { reason: '使用预定义的评分细则' };
                workflow.results.scoringRubric = workflow.options.scoringRubric;
            } else {
                // 生成评分细则
                const rubric = await this.aiScoringEngine.generateScoringRubric(
                    workflow.questionInfo.content || '',
                    workflow.referenceAnswer || '',
                    workflow.questionInfo.type || 'subjective'
                );

                step.status = 'completed';
                step.result = {
                    dimensions: rubric.dimensions.length,
                    totalScore: rubric.totalScore,
                    difficulty: rubric.difficulty
                };

                workflow.results.scoringRubric = rubric;
            }

            workflow.steps.push(step);
            this.emit('step-completed', { step, workflow });
        } catch (error) {
            await this.handleStepError(workflow, 'generate-rubric', error);
        }
    }

    /**
     * 执行AI评分
     */
    async performAIScoring(workflow) {
        this.logger.info('步骤4:执行AI视觉识别评分');
        this.workflowState = 'scoring';

        try {
            const step = this.createStep('ai-scoring', 'AI视觉识别评分');

            const imageDataUrl = workflow.results.capturedImage.dataUrl;
            const scoringRubric = workflow.results.scoringRubric;

            // 执行AI评分
            const scoringResult = await this.aiScoringEngine.analyzeAnswerCard(
                imageDataUrl,
                scoringRubric,
                workflow.studentInfo
            );

            step.status = 'completed';
            step.result = {
                totalScore: scoringResult.totalScore,
                confidence: scoringResult.confidence,
                scoringTime: scoringResult.scoringTime,
                dimensions: scoringResult.breakdown.length
            };

            workflow.steps.push(step);
            workflow.results.scoringResult = scoringResult;

            this.emit('step-completed', { step, workflow });
        } catch (error) {
            await this.handleStepError(workflow, 'ai-scoring', error);
        }
    }

    /**
     * 处理评分结果
     */
    async processScoringResult(workflow) {
        this.logger.info('步骤5:处理评分结果');
        this.workflowState = 'processing';

        try {
            const step = this.createStep('process-result', '处理评分结果');

            const scoringResult = workflow.results.scoringResult;
            const confidence = scoringResult.confidence;
            const threshold = workflow.options.confidenceThreshold;

            // 基于置信度决定后续流程
            if (confidence >= threshold) {
                // 高置信度:自动同步分数
                step.status = 'completed';
                step.result = {
                    decision: 'auto-sync',
                    confidence,
                    threshold,
                    reason: '置信度高于阈值,自动同步分数'
                };

                // 同步分数到智学网
                await this.syncScoreToZhixue(workflow);
            } else {
                // 低置信度:转入人工复核
                step.status = 'completed';
                step.result = {
                    decision: 'manual-review',
                    confidence,
                    threshold,
                    reason: '置信度低于阈值,转入人工复核'
                };

                // 触发人工复核流程
                await this.triggerManualReview(workflow);
            }

            workflow.steps.push(step);
            workflow.decision = step.result.decision;

            this.emit('step-completed', { step, workflow });
        } catch (error) {
            await this.handleStepError(workflow, 'process-result', error);
        }
    }

    /**
     * 同步分数到智学网
     */
    async syncScoreToZhixue(workflow) {
        this.logger.info('同步分数到智学网');
        this.workflowState = 'syncing';

        try {
            const scoringResult = workflow.results.scoringResult;

            // 同步分数
            await this.zhixueAdapter.syncScore(scoringResult);

            // 如果需要确认,等待用户确认
            if (workflow.options.requireConfirmation) {
                await this.waitForUserConfirmation(workflow);
            }

            this.emit('score-synced', {
                score: scoringResult.totalScore,
                confidence: scoringResult.confidence,
                workflow
            });
        } catch (error) {
            this.logger.error('分数同步失败', error);
            throw error;
        }
    }

    /**
     * 触发人工复核
     */
    async triggerManualReview(workflow) {
        this.logger.info('触发人工复核流程');

        // 将当前结果标记为需要复核
        workflow.needsReview = true;
        workflow.reviewData = {
            originalResult: workflow.results.scoringResult,
            reason: 'AI置信度较低',
            suggestions: workflow.results.scoringResult.feedback
        };

        // 切换到人工复核标签
        this.emit('manual-review-required', {
            workflow,
            reviewData: workflow.reviewData
        });
    }

    /**
     * 处理元素检测结果
     */
    handleElementsDetected(data) {
        this.logger.debug('元素检测结果', data);

        // 如果检测到必要的元素,可以自动开始工作流
        if (this.autoMode && data.detectedCount >= 2) {
            this.logger.info('检测到必要元素,自动开始评分工作流');
            this.startGradingWorkflow();
        }
    }

    /**
     * 处理图片捕捉结果
     */
    handleImageCaptured(data) {
        this.logger.debug('图片捕捉完成', {
            dimensions: data.dimensions,
            quality: data.quality
        });
    }

    /**
     * 处理评分结果
     */
    handleScoringCompleted(data) {
        this.logger.info('AI评分完成', {
            totalScore: data.result.totalScore,
            confidence: data.result.confidence,
            scoringTime: data.scoringTime
        });
    }

    /**
     * 处理评分细则生成
     */
    handleRubricGenerated(data) {
        this.logger.debug('评分细则已生成', {
            dimensions: data.rubric.dimensions.length,
            totalScore: data.rubric.totalScore
        });
    }

    /**
     * 处理分数同步
     */
    handleScoreSynced(data) {
        this.logger.info('分数同步完成', {
            score: data.score,
            confidence: data.confidence
        });
    }

    /**
     * 创建工作流步骤
     */
    createStep(name, description) {
        return {
            name,
            description,
            status: 'running',
            startTime: Date(),
            endTime: null,
            result: null,
            warnings: [],
            errors: []
        };
    }

    /**
     * 等待页面加载完成
     */
    async waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    /**
     * 验证图片质量
     */
    validateImageQuality(dataUrl) {
        // 这里可以实现更复杂的图片质量验证
        // 目前返回模拟的质量评估
        return {
            score: 85,
            dimensions: { width: 800, height: 600 },
            brightness: 75,
            contrast: 80,
            sharpness: 70
        };
    }

    /**
     * 等待用户确认
     */
    async waitForUserConfirmation(workflow) {
        this.logger.info('等待用户确认分数同步');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('用户确认超时'));
            }, 30000); // 30秒超时

            const handleConfirmation = (confirmed) => {
                clearTimeout(timeout);
                if (confirmed) {
                    resolve();
                } else {
                    reject(new Error('用户取消分数同步'));
                }
            };

            // 监听用户确认事件
            this.once('user-confirmed', handleConfirmation);
            this.once('user-cancelled', () => handleConfirmation(false));
        });
    }

    /**
     * 处理工作流步骤错误
     */
    async handleStepError(workflow, stepName, error) {
        this.logger.error(`步骤 ${stepName} 执行失败`, error);

        const step = workflow.steps.find(s => s.name === stepName);
        if (step) {
            step.status = 'failed';
            step.endTime = Date();
            step.errors.push({
                message: error.message,
                stack: error.stack
            });
        }

        workflow.errors.push({
            step: stepName,
            error: error.message,
            timestamp: Date()
        });

        workflow.status = 'failed';

        this.emit('step-failed', {
            step: stepName,
            error: error.message,
            workflow
        });

        // 根据错误类型决定是否重试或转入人工复核
        await this.handleWorkflowError(error);
    }

    /**
     * 处理工作流错误
     */
    async handleWorkflowError(error) {
        this.workflowState = 'error';

        // 分析错误类型
        const errorType = this.classifyError(error);

        switch (errorType) {
        case 'network':
            // 网络错误,稍后重试
            this.logger.info('网络错误,稍后重试');
            setTimeout(() => {
                this.retryCurrentWorkflow();
            }, this.config.retryDelay);
            break;

        case 'element-detection':
            // 元素检测失败,转入人工模式
            this.logger.warn('元素检测失败,转入人工模式');
            this.emit('manual-mode-required', {
                reason: '无法自动检测页面元素',
                error: error.message
            });
            break;

        case 'ai-scoring':
            // AI评分失败,直接转入人工复核
            this.logger.warn('AI评分失败,转入人工复核');
            if (this.currentWorkflow) {
                await this.triggerManualReview(this.currentWorkflow);
            }
            break;

        default:
            // 其他错误,报告给上层
            this.emit('workflow-error', { error: error.message });
        }
    }

    /**
     * 分类错误类型
     */
    classifyError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('network') || message.includes('connection')) {
            return 'network';
        }

        if (message.includes('element') || message.includes('detection') || message.includes('not found')) {
            return 'element-detection';
        }

        if (message.includes('ai') || message.includes('scoring') || message.includes('recognition')) {
            return 'ai-scoring';
        }

        return 'unknown';
    }

    /**
     * 重试当前工作流
     */
    async retryCurrentWorkflow() {
        if (this.currentWorkflow && this.currentWorkflow.retries < this.config.maxRetries) {
            this.currentWorkflow.retries++;
            this.logger.info(`工作流重试第${this.currentWorkflow.retries}次`);

            // 重置工作流状态
            this.currentWorkflow.status = 'retrying';
            this.currentWorkflow.errors = [];

            // 重新开始工作流
            await this.startGradingWorkflow(this.currentWorkflow.options);
        } else {
            this.logger.error('工作流重试次数已用完');
            this.emit('workflow-max-retries-exceeded');
        }
    }

    /**
     * 生成工作流ID
     */
    generateWorkflowId() {
        return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 设置自动模式
     */
    setAutoMode(enabled) {
        this.autoMode = enabled;
        this.logger.info(`自动模式${enabled ? '开启' : '关闭'}`);
        this.emit('auto-mode-changed', { enabled });
    }

    /**
     * 获取工作流状态
     */
    getWorkflowState() {
        return {
            state: this.workflowState,
            isProcessing: this.isProcessing,
            autoMode: this.autoMode,
            currentWorkflow: this.currentWorkflow
                ? {
                    id: this.currentWorkflow.id,
                    status: this.currentWorkflow.status,
                    stepCount: this.currentWorkflow.steps.length,
                    errors: this.currentWorkflow.errors.length
                }
                : null
        };
    }

    /**
     * 获取工作流历史
     */
    getWorkflowHistory(limit = 10) {
        return this.workflowHistory.slice(-limit).map(workflow => ({
            id: workflow.id,
            startTime: workflow.startTime,
            status: workflow.status,
            decision: workflow.decision,
            totalScore: workflow.results.scoringResult?.totalScore,
            confidence: workflow.results.scoringResult?.confidence
        }));
    }

    /**
     * 销毁工作流管理器
     */
    async destroy() {
        this.logger.info('销毁工作流管理器');

        // 停止当前工作流
        if (this.isProcessing) {
            this.isProcessing = false;
            this.workflowState = 'idle';
        }

        // 销毁子组件
        if (this.zhixueAdapter) {
            await this.zhixueAdapter.destroy();
        }

        if (this.aiScoringEngine) {
            await this.aiScoringEngine.destroy();
        }

        if (this.aiService) {
            await this.aiService.destroy();
        }

        this.workflowHistory = [];
        this.currentWorkflow = null;

        this.emit('workflow-destroyed');
        this.logger.info('工作流管理器已销毁');
    }
}
