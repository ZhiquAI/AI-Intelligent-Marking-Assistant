/**
 * Grading Processor
 * 评分处理器 - 集成OCR和AI评分的主要处理逻辑
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { OCRService } from '../../services/ocr-service.js';
import { AIGrader } from './ai-grader.js';
import { ToastNotifier } from '../../ui/components/toast-notifier.js';

export class GradingProcessor extends EventEmitter {
    constructor() {
        super();
        this.ocrService = new OCRService();
        this.aiGrader = new AIGrader();
        this.toastNotifier = null;
        this.isProcessing = false;
        this.currentTask = null;
        this.processingQueue = [];
        this.maxConcurrent = 3;
        this.currentConcurrent = 0;

        
    }

    /**
     * 初始化评分处理器
     */
    async initialize(config) {
        try {
            

            // 初始化Toast通知
            this.toastNotifier = new ToastNotifier();
            document.body.appendChild(this.toastNotifier.getElement());

            // 配置OCR服务
            await this.ocrService.configure({
                language: config.language || 'zh-CN',
                maxFileSize: config.maxFileSize || 10 * 1024 * 1024,
                enhance: config.enhanceOCR !== false,
                mathOptimization: true,
                chinesePunctuation: true
            });

            // 配置AI评分引擎
            await this.aiGrader.configure({
                apiKey: config.apiKey,
                apiType: config.apiType || 'openai',
                confidenceThreshold: config.confidenceThreshold || 0.8,
                dualModelValidation: config.dualModelValidation || false,
                gradingRubric: config.gradingRubric
            });

            // 绑定事件
            this.bindEvents();

            
            this.showSuccess('评分处理器初始化成功');

        } catch (error) {
            // console.error('❌ 评分处理器初始化失败:', error);
            this.showError('评分处理器初始化失败: ' + error.message);
            throw error;
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // OCR服务事件
        this.ocrService.on('processing-start', (data) => {
            this.emit('ocr-start', data);
            this.showInfo(`正在处理图片: ${data.file.name}`);
        });

        this.ocrService.on('processing-complete', (data) => {
            this.emit('ocr-complete', data);
             + '...');
        });

        this.ocrService.on('processing-error', (data) => {
            this.emit('ocr-error', data);
            this.showError(`OCR处理失败: ${data.error.message}`);
        });

        this.ocrService.on('batch-progress', (data) => {
            this.emit('ocr-batch-progress', data);
            this.updateProgress('ocr', data.current, data.total);
        });

        // AI评分引擎事件
        this.aiGrader.on('grading-start', (data) => {
            this.emit('grading-start', data);
            this.showInfo('开始AI评分...');
        });

        this.aiGrader.on('grading-complete', (data) => {
            this.emit('grading-complete', data);
            
            this.showSuccess(`评分完成: ${data.result.score}/${data.result.totalScore}分`);
        });

        this.aiGrader.on('grading-error', (data) => {
            this.emit('grading-error', data);
            this.showError(`评分失败: ${data.error.message}`);
        });

        this.aiGrader.on('batch-progress', (data) => {
            this.emit('grading-batch-progress', data);
            this.updateProgress('grading', data.current, data.total);
        });
    }

    /**
     * 处理单个文件
     */
    async processFile(file, questionData, options = {}) {
        try {
            this.isProcessing = true;
            this.currentTask = { file, questionData, type: 'single' };

            
            this.emit('processing-start', { file, questionData });

            // 1. OCR处理
            const ocrResult = await this.performOCR(file, options);

            // 2. AI评分
            const gradingResult = await this.performGrading(ocrResult, questionData, options);

            const finalResult = {
                file: file.name,
                ocr: ocrResult,
                grading: gradingResult,
                success: true,
                timestamp: Date.now()
            };

            this.emit('processing-complete', finalResult);
            return finalResult;

        } catch (error) {
            // console.error('处理失败:', error);
            const errorResult = {
                file: file.name,
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
            this.emit('processing-error', errorResult);
            throw error;
        } finally {
            this.isProcessing = false;
            this.currentTask = null;
        }
    }

    /**
     * 批量处理文件
     */
    async processFiles(files, questions, options = {}) {
        try {
            this.isProcessing = true;
            this.currentTask = { files, questions, type: 'batch' };

            
            this.emit('batch-processing-start', { total: files.length });

            const results = [];

            // 创建处理任务
            const tasks = files.map((file, index) => ({
                file,
                question: questions[index] || questions[0], // 如果没有对应题目，使用第一个
                index
            }));

            // 并发处理
            const processTask = async (task) => {
                try {
                    const result = await this.processFile(
                        task.file,
                        task.question,
                        options
                    );
                    return { ...result, index: task.index };
                } catch (error) {
                    return {
                        file: task.file.name,
                        success: false,
                        error: error.message,
                        index: task.index
                    };
                }
            };

            // 控制并发数
            for (let i = 0; i < tasks.length; i += this.maxConcurrent) {
                const batch = tasks.slice(i, i + this.maxConcurrent);
                const batchResults = await Promise.all(batch.map(processTask));
                results.push(...batchResults);

                this.emit('batch-progress', {
                    processed: Math.min(i + this.maxConcurrent, tasks.length),
                    total: tasks.length
                });
            }

            // 按原始顺序排序结果
            results.sort((a, b) => a.index - b.index);

            const finalResults = {
                results: results,
                total: files.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                timestamp: Date.now()
            };

            this.emit('batch-processing-complete', finalResults);
            return finalResults;

        } catch (error) {
            // console.error('批量处理失败:', error);
            this.emit('batch-processing-error', { error });
            throw error;
        } finally {
            this.isProcessing = false;
            this.currentTask = null;
        }
    }

    /**
     * 执行OCR处理
     */
    async performOCR(file, options) {
        try {
            

            const ocrResult = await this.ocrService.processImage(file, {
                language: options.language || 'zh-CN',
                enhance: options.enhanceOCR !== false,
                mathOptimization: true,
                chinesePunctuation: true
            });

            // 验证OCR结果
            if (!ocrResult.text || ocrResult.text.trim().length === 0) {
                throw new Error('OCR未能识别出任何文字');
            }

            if (ocrResult.confidence < 50) {
                // console.warn('OCR置信度较低:', ocrResult.confidence);
                this.showWarning('OCR识别置信度较低，可能影响评分准确性');
            }

            return ocrResult;

        } catch (error) {
            // console.error('OCR处理失败:', error);
            throw new Error('OCR处理失败: ' + error.message);
        }
    }

    /**
     * 执行AI评分
     */
    async performGrading(ocrResult, questionData, options) {
        try {
            

            // 准备学生答案数据
            const studentAnswer = {
                text: ocrResult.text,
                structure: ocrResult.structure,
                confidence: ocrResult.confidence,
                ocrDetails: {
                    lines: ocrResult.lines,
                    words: ocrResult.words,
                    language: ocrResult.language
                }
            };

            // 执行评分
            const gradingResult = await this.aiGrader.gradeAnswer(
                studentAnswer,
                questionData,
                options
            );

            // 添加OCR信息到结果
            gradingResult.ocrConfidence = ocrResult.confidence;
            gradingResult.processedText = ocrResult.text;

            return gradingResult;

        } catch (error) {
            // console.error('AI评分失败:', error);
            throw new Error('AI评分失败: ' + error.message);
        }
    }

    /**
     * 处理队列中的任务
     */
    async processQueue() {
        if (this.processingQueue.length === 0 || this.currentConcurrent >= this.maxConcurrent) {
            return;
        }

        const task = this.processingQueue.shift();
        this.currentConcurrent++;

        try {
            await task.process();
        } catch (error) {
            // console.error('队列任务处理失败:', error);
            task.reject(error);
        } finally {
            this.currentConcurrent--;
            // 继续处理队列
            setTimeout(() => this.processQueue(), 100);
        }
    }

    /**
     * 添加到处理队列
     */
    addToQueue(processFn) {
        return new Promise((resolve, reject) => {
            this.processingQueue.push({
                process: processFn,
                resolve: resolve,
                reject: reject
            });

            this.processQueue();
        });
    }

    /**
     * 更新进度
     */
    updateProgress(type, current, total) {
        const progress = Math.round((current / total) * 100);
        this.emit('progress-update', { type, progress, current, total });

        if (this.toastNotifier) {
            this.toastNotifier.info(`${type === 'ocr' ? 'OCR' : '评分'}进度: ${progress}% (${current}/${total})`);
        }
    }

    /**
     * 获取处理状态
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentTask: this.currentTask,
            queueLength: this.processingQueue.length,
            currentConcurrent: this.currentConcurrent,
            maxConcurrent: this.maxConcurrent,
            ocrStatus: this.ocrService.getStatus(),
            gradingStatus: this.aiGrader.getStatus()
        };
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        if (this.toastNotifier) {
            this.toastNotifier.success(message);
        }
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        if (this.toastNotifier) {
            this.toastNotifier.error(message);
        }
    }

    /**
     * 显示信息消息
     */
    showInfo(message) {
        if (this.toastNotifier) {
            this.toastNotifier.info(message);
        }
    }

    /**
     * 显示警告消息
     */
    showWarning(message) {
        if (this.toastNotifier) {
            this.toastNotifier.warning(message);
        }
    }

    /**
     * 暂停处理
     */
    pause() {
        this.isProcessing = false;
        
        this.showInfo('处理已暂停');
    }

    /**
     * 恢复处理
     */
    resume() {
        this.isProcessing = true;
        
        this.showInfo('处理已恢复');
        this.processQueue();
    }

    /**
     * 取消当前处理
     */
    cancel() {
        this.isProcessing = false;
        this.processingQueue = [];
        this.currentTask = null;
        this.currentConcurrent = 0;

        
        this.showInfo('处理已取消');
        this.emit('processing-cancelled');
    }

    /**
     * 销毁处理器
     */
    async destroy() {
        this.cancel();

        if (this.ocrService) {
            this.ocrService.destroy();
        }

        if (this.aiGrader) {
            this.aiGrader.destroy();
        }

        if (this.toastNotifier) {
            this.toastNotifier.destroy();
        }

        this.removeAllListeners();
        
    }
}

// 创建全局实例
export const gradingProcessor = new GradingProcessor();
