/**
 * 智学网AI阅卷助手 - Content Script
 * 在智学网页面中注入AI阅卷功能
 */

import { MainLayout } from './ui/components/main-layout.js';
import { ToastNotifier } from './ui/components/toast-notifier.js';
import { AIService } from './services/ai-service.js';
import { SecurityManager } from './utils/security.js';
import { EventEmitter } from './utils/event-emitter.js';
import { createElement, addClass } from './utils/dom-utils.js';
import { GradingProcessor } from './core/grading/grading-processor.js';
import { ManualReviewPanel } from './core/review/manual-review-panel.js';

// 标记content script已注入
window.zhixueExtensionInjected = true;

/**
 * 智学网页面集成管理器
 */
class ZhixueIntegration extends EventEmitter {
    constructor() {
        super();
        this.isActive = false;
        this.mainLayout = null;
        this.toastNotifier = null;
        this.aiService = null;
        this.securityManager = null;
        this.originalContent = null;
        this.init();
    }

    /**
     * 初始化
     */
    async init() {
        

        // 等待页面完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * 设置集成
     */
    async setup() {
        try {
            // 检查是否是智学网相关页面
            if (!this.isZhixuePage()) {
                
                return;
            }

            

            // 初始化安全管理器
            this.securityManager = new SecurityManager();

            // 初始化Toast通知系统
            this.toastNotifier = new ToastNotifier();
            document.body.appendChild(this.toastNotifier.getElement());

            // 初始化AI服务
            this.aiService = new AIService();

            // 初始化评分处理器
            this.gradingProcessor = new GradingProcessor();

            // 初始化人工复核面板
            this.manualReviewPanel = new ManualReviewPanel();
            document.body.appendChild(this.manualReviewPanel.getElement());

            // 创建主界面
            this.createMainInterface();

            // 绑定事件
            this.bindEvents();

            // 检查页面类型并注入相应功能
            this.injectByPageType();

            this.isActive = true;
            

            // 初始化人工复核功能
            this.initializeManualReview();

            // 显示欢迎消息
            this.showWelcomeMessage();
        } catch (error) {
            // console.error('❌ 智学网集成设置失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }

    /**
     * 检查是否是智学网页面
     */
    isZhixuePage() {
        const hostname = window.location.hostname;

        // 检查域名 - 只要是智学网域名就注入
        return (
            hostname.includes('zhixue.com') ||
            hostname.includes('zhixue.cn') ||
            hostname.includes('zxjy')
        );
    }

    /**
     * 创建主界面
     */
    createMainInterface() {
        // 保存原始内容
        this.originalContent = document.body.innerHTML;

        // 创建主布局容器
        this.mainContainer = createElement('div', {
            className: 'zhixue-ai-extension',
            styles: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                zIndex: '999999',
                background: '#f5f7fa',
                display: 'none'
            }
        });

        // 创建主布局
        this.mainLayout = new MainLayout();
        this.mainContainer.appendChild(this.mainLayout.getElement());

        // 添加到页面
        document.body.appendChild(this.mainContainer);

        // 创建切换按钮
        this.createToggleButton();
    }

    /**
     * 创建切换按钮
     */
    createToggleButton() {
        this.toggleButton = createElement('button', {
            className: 'zhixue-ai-toggle',
            innerHTML: `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L4 7v10c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V9c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v7c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V7l-8-5z" fill="currentColor"/>
                </svg>
                AI阅卷
            `,
            styles: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '1000000',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }
        });

        // 添加悬停效果
        this.toggleButton.addEventListener('mouseenter', () => {
            this.toggleButton.style.transform = 'translateY(-2px)';
            this.toggleButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });

        this.toggleButton.addEventListener('mouseleave', () => {
            this.toggleButton.style.transform = 'translateY(0)';
            this.toggleButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        });

        // 绑定点击事件
        this.toggleButton.addEventListener('click', () => {
            this.toggleInterface();
        });

        document.body.appendChild(this.toggleButton);
    }

    /**
     * 根据页面类型注入功能
     */
    injectByPageType() {
        const pathname = window.location.pathname;

        if (pathname.includes('/marking') || pathname.includes('/paper')) {
            // 阅卷相关页面
            this.injectMarkingFeatures();
        } else if (pathname.includes('/exam')) {
            // 考试相关页面
            this.injectExamFeatures();
        } else if (pathname.includes('/teacher')) {
            // 教师端页面
            this.injectTeacherFeatures();
        }
    }

    /**
     * 注入阅卷功能
     */
    injectMarkingFeatures() {
        

        // 监听文件上传事件
        this.mainLayout.on('files-uploaded', data => {
            this.handleFileUpload(data.files);
        });

        // 监听标签切换事件
        this.mainLayout.on('tab-changed', data => {
            this.handleTabChange(data.tab);
        });

        // 更新状态指示器
        this.updateStatusIndicators();
    }

    /**
     * 注入考试功能
     */
    injectExamFeatures() {
        
        // TODO: 实现考试相关功能
    }

    /**
     * 注入教师功能
     */
    injectTeacherFeatures() {
        
        // TODO: 实现教师相关功能
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 监听来自background script的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleBackgroundMessage(message, sender, sendResponse);
            return true; // 保持消息通道开放
        });

        // 监听键盘快捷键
        document.addEventListener('keydown', e => {
            this.handleKeyboardShortcuts(e);
        });

        // 监听页面卸载
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * 处理文件上传 - 集成OCR和AI评分
     */
    async handleFileUpload(files) {
        try {
            this.showInfo(`正在初始化评分处理器...`);

            // 初始化评分处理器（如果尚未初始化）
            if (!this.gradingProcessor.isProcessing) {
                await this.initializeGradingProcessor();
            }

            // 准备题目数据（这里使用模拟数据，实际应从界面获取）
            const questions = this.prepareQuestionData(files.length);

            this.showInfo(`正在处理 ${files.length} 个文件...`);

            // 批量处理文件
            const results = await this.gradingProcessor.processFiles(files, questions, {
                language: 'zh-CN',
                enhanceOCR: true,
                dualModelValidation: false,
                confidenceThreshold: 0.8
            });

            // 显示结果摘要
            const summary = `处理完成：成功 ${results.successful} 个，失败 ${results.failed} 个`;
            this.showSuccess(summary);

            // 详细展示结果
            this.displayGradingResults(results);
        } catch (error) {
            // console.error('文件处理失败:', error);
            this.showError('文件处理失败: ' + error.message);
        }
    }

    /**
     * 处理标签切换
     */
    handleTabChange(tab) {
        

        switch (tab) {
            case 'ai-grading':
                this.showInfo('智能阅卷模式');
                break;
            case 'manual-review':
                this.showInfo('人工复核模式');
                break;
            case 'data-analysis':
                this.showInfo('数据分析模式');
                break;
        }
    }

    /**
     * 切换界面显示
     */
    toggleInterface() {
        if (this.mainContainer.style.display === 'none') {
            this.showInterface();
        } else {
            this.hideInterface();
        }
    }

    /**
     * 显示界面
     */
    showInterface() {
        this.mainContainer.style.display = 'block';
        this.toggleButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
            关闭
        `;
        this.showInfo('AI阅卷助手已打开');
    }

    /**
     * 隐藏界面
     */
    hideInterface() {
        this.mainContainer.style.display = 'none';
        this.toggleButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7v10c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V9c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v7c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V7l-8-5z" fill="currentColor"/>
            </svg>
            AI阅卷
        `;
        this.showInfo('AI阅卷助手已隐藏');
    }

    /**
     * 更新状态指示器
     */
    updateStatusIndicators() {
        if (!this.mainLayout) return;

        const header = this.mainLayout.getHeader();
        if (!header) return;

        // 模拟状态更新
        setTimeout(() => {
            header.updateStatus('ai-connection', 'connected', 'AI服务已连接');
        }, 1000);

        setTimeout(() => {
            header.updateStatus('image-positioning', 'ready', '图像定位就绪');
        }, 2000);
    }

    /**
     * 处理后台消息
     */
    async handleBackgroundMessage(message, sender, sendResponse) {
        const { action, data } = message;

        

        switch (action) {
            case 'TOGGLE_INTERFACE':
                this.toggleInterface();
                break;

            case 'SHOW_NOTIFICATION':
                this.showNotification(data.type, data.message);
                break;

            case 'UPDATE_SETTINGS':
                await this.updateSettings(data);
                break;

            default:
                // console.warn(`未知操作: ${action}`);
        }
    }

    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcuts(e) {
        // Ctrl+Shift+A 切换界面
        if (e.ctrlKey && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            this.toggleInterface();
        }

        // Esc 隐藏界面
        if (e.key === 'Escape' && this.mainContainer.style.display !== 'none') {
            this.hideInterface();
        }
    }

    /**
     * 显示欢迎消息
     */
    showWelcomeMessage() {
        this.showSuccess('🎉 AI智能阅卷助手已就绪');
        this.showInfo('💡 按 Ctrl+Shift+A 快速切换界面');
    }

    /**
     * 显示通知
     */
    showNotification(type, message) {
        if (this.toastNotifier) {
            this.toastNotifier[type](message);
        }
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showNotification('success', message);
    }

    /**
     * 显示信息消息
     */
    showInfo(message) {
        this.showNotification('info', message);
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        this.showNotification('error', message);
    }

    /**
     * 初始化评分处理器
     */
    async initializeGradingProcessor() {
        try {
            // 获取API配置（这里应该从设置中获取）
            const apiConfig = await this.getAPIConfig();

            await this.gradingProcessor.initialize({
                apiKey: apiConfig.apiKey,
                apiType: apiConfig.apiType || 'openai',
                language: 'zh-CN',
                enhanceOCR: true,
                confidenceThreshold: 0.8,
                dualModelValidation: false
            });

            
        } catch (error) {
            // console.error('评分处理器初始化失败:', error);
            throw new Error('评分处理器初始化失败: ' + error.message);
        }
    }

    /**
     * 获取API配置（模拟实现）
     */
    async getAPIConfig() {
        // 实际应该从chrome.storage或设置中获取
        return {
            apiKey: 'your-api-key-here', // 这里应该从安全存储中获取
            apiType: 'openai'
        };
    }

    /**
     * 准备题目数据（模拟实现）
     */
    prepareQuestionData(count) {
        const questions = [];

        for (let i = 0; i < count; i++) {
            questions.push({
                id: `question_${i + 1}`,
                title: `第${i + 1}题`,
                content: '解方程组：\n(1) x + y = 10\n(2) x - y = 2',
                standardAnswer: 'x = 6, y = 4',
                totalScore: 10,
                questionType: '解答题',
                gradingPoints: [
                    { description: '正确列出方程组', score: 3 },
                    { description: '正确求解方程', score: 4 },
                    { description: '验证结果', score: 2 },
                    { description: '答案完整', score: 1 }
                ]
            });
        }

        return questions;
    }

    /**
     * 展示评分结果
     */
    displayGradingResults(results) {
        if (!results.results || results.results.length === 0) {
            return;
        }

        // 创建结果显示区域
        const resultsContainer = this.createResultsContainer();

        results.results.forEach((result, index) => {
            if (result.success) {
                this.displaySingleResult(result, index, resultsContainer);
            } else {
                this.displayErrorResult(result, index, resultsContainer);
            }
        });

        // 添加到界面
        const contentArea = this.mainLayout.element.querySelector('.ai-grading-container');
        const existingResults = contentArea.querySelector('.grading-results');
        if (existingResults) {
            existingResults.remove();
        }
        contentArea.appendChild(resultsContainer);
    }

    /**
     * 创建结果显示容器
     */
    createResultsContainer() {
        return createElement('div', {
            className: 'grading-results',
            innerHTML: `
                <div class="results-header">
                    <h3>评分结果</h3>
                    <button class="export-results-btn">导出结果</button>
                </div>
                <div class="results-content"></div>
            `
        });
    }

    /**
     * 显示单个评分结果
     */
    displaySingleResult(result, index, container) {
        const grading = result.grading;
        const ocr = result.ocr;

        const resultItem = createElement('div', {
            className: 'result-item',
            innerHTML: `
                <div class="result-header">
                    <h4>第${index + 1}题 - ${grading.gradeLevel}</h4>
                    <div class="score-display">${grading.score}/${grading.totalScore}</div>
                </div>
                <div class="result-content">
                    <div class="ocr-section">
                        <h5>OCR识别结果</h5>
                        <div class="ocr-text">${ocr.text.substring(0, 200)}...</div>
                        <div class="ocr-confidence">识别置信度: ${ocr.confidence.toFixed(1)}%</div>
                    </div>
                    <div class="grading-section">
                        <h5>评分详情</h5>
                        <div class="confidence">AI置信度: ${(grading.confidence * 100).toFixed(1)}%</div>
                        <div class="feedback">${grading.feedback}</div>
                        <div class="grading-details">
                            ${grading.gradingDetails
                                .map(
                                    detail => `
                                <div class="grading-point">
                                    <span class="point-name">${detail.criterion}</span>
                                    <span class="point-score">${detail.score}分</span>
                                    <span class="point-feedback">${detail.feedback}</span>
                                </div>
                            `
                                )
                                .join('')}
                        </div>
                    </div>
                </div>
            `
        });

        container.querySelector('.results-content').appendChild(resultItem);
    }

    /**
     * 显示错误结果
     */
    displayErrorResult(result, index, container) {
        const resultItem = createElement('div', {
            className: 'result-item error',
            innerHTML: `
                <div class="result-header">
                    <h4>第${index + 1}题 - 处理失败</h4>
                    <div class="error-icon">⚠️</div>
                </div>
                <div class="error-content">
                    <div class="error-message">${result.error}</div>
                    <div class="file-name">文件: ${result.file}</div>
                </div>
            `
        });

        container.querySelector('.results-content').appendChild(resultItem);
    }

    /**
     * 更新进度
     */
    updateProgress(type, progress) {
        
    }

    /**
     * 初始化人工复核功能
     */
    initializeManualReview() {
        // 绑定复核面板事件
        this.manualReviewPanel.on('review-completed', data => {
            this.handleReviewCompleted(data);
        });

        this.manualReviewPanel.on('history-updated', data => {
            this.updateReviewHistory(data);
        });

        // 绑定人工复核界面事件
        this.bindManualReviewEvents();

        // 初始化复核列表
        this.updateReviewList();

        
    }

    /**
     * 绑定人工复核界面事件
     */
    bindManualReviewEvents() {
        // 筛选条件变更
        const filterSelect = this.mainLayout.element.querySelector('#review-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', e => {
                this.filterReviewList(e.target.value);
            });
        }

        // 批量复核按钮
        const batchReviewBtn = this.mainLayout.element.querySelector('#batch-review-btn');
        if (batchReviewBtn) {
            batchReviewBtn.addEventListener('click', () => {
                this.startBatchReview();
            });
        }

        // 导出复核记录按钮
        const exportBtn = this.mainLayout.element.querySelector('#export-reviews-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportReviewRecords();
            });
        }

        // 查看统计按钮
        const statsBtn = this.mainLayout.element.querySelector('#view-statistics-btn');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.showReviewStatistics();
            });
        }
    }

    /**
     * 更新复核列表
     */
    updateReviewList() {
        const reviewList = this.mainLayout.element.querySelector('#review-list');
        if (!reviewList) return;

        // 获取需要复核的项目（这里使用模拟数据）
        const reviewItems = this.getReviewItems();

        if (reviewItems.length === 0) {
            reviewList.innerHTML = this.createEmptyReviewState();
            return;
        }

        reviewList.innerHTML = reviewItems.map(item => this.createReviewItem(item)).join('');

        // 更新统计
        this.updateReviewStatistics(reviewItems);
    }

    /**
     * 获取复核项目（模拟数据）
     */
    getReviewItems() {
        // 这里应该从实际的评分结果中获取需要复核的项目
        // 基于置信度、双模型差异等条件筛选
        return [
            {
                id: 'review_1',
                studentName: '张三',
                studentId: '2023001',
                questionNumber: '第1题',
                originalScore: 6,
                totalScore: 10,
                aiConfidence: 0.65,
                status: 'low-confidence',
                needsReview: true
            },
            {
                id: 'review_2',
                studentName: '李四',
                studentId: '2023002',
                questionNumber: '第2题',
                originalScore: 8,
                totalScore: 10,
                aiConfidence: 0.45,
                status: 'low-confidence',
                needsReview: true
            },
            {
                id: 'review_3',
                studentName: '王五',
                studentId: '2023003',
                questionNumber: '第3题',
                originalScore: 3,
                totalScore: 10,
                aiConfidence: 0.72,
                status: 'needs-review',
                needsReview: true
            }
        ];
    }

    /**
     * 创建复核项目元素
     */
    createReviewItem(item) {
        const confidenceColor = this.getConfidenceColor(item.aiConfidence);
        const statusBadge = this.getStatusBadge(item.status);

        return `
            <div class="review-item" data-review-id="${item.id}">
                <div class="student-info">
                    <div class="student-name">${item.studentName}</div>
                    <div class="student-id">${item.studentId}</div>
                </div>
                <div class="question-number">${item.questionNumber}</div>
                <div class="ai-score">
                    <div class="score-display">${item.originalScore}/${item.totalScore}</div>
                </div>
                <div class="confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${item.aiConfidence * 100}%"></div>
                    </div>
                    <div class="confidence-text">${(item.aiConfidence * 100).toFixed(1)}%</div>
                </div>
                <div class="status">${statusBadge}</div>
                <div class="actions">
                    <button class="review-btn" onclick="window.zhixueAIIntegration.openReview('${item.id}')">复核</button>
                </div>
            </div>
        `;
    }

    /**
     * 创建空复核状态
     */
    createEmptyReviewState() {
        return `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <path d="M32 8l16 8-16 8-16-8 16-8zM16 24l16 8 16-8M16 32l16 8 16-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 40l16 8 16-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>暂无需要复核的试卷</h3>
                <p>所有试卷的AI评分置信度都很高</p>
            </div>
        `;
    }

    /**
     * 获取置信度颜色
     */
    getConfidenceColor(confidence) {
        if (confidence >= 0.8) return '#10b981';
        if (confidence >= 0.6) return '#f59e0b';
        return '#ef4444';
    }

    /**
     * 获取状态徽章
     */
    getStatusBadge(status) {
        const badges = {
            'low-confidence': '<span class="status-badge status-low-confidence">低置信度</span>',
            'needs-review': '<span class="status-badge status-needs-review">需复核</span>',
            disputed: '<span class="status-badge status-disputed">有争议</span>',
            completed: '<span class="status-badge status-completed">已完成</span>'
        };
        return badges[status] || '<span class="status-badge status-pending">待处理</span>';
    }

    /**
     * 筛选复核列表
     */
    filterReviewList(filter) {
        const reviewItems = this.getReviewItems();
        let filtered = reviewItems;

        switch (filter) {
            case 'low-confidence':
                filtered = reviewItems.filter(item => item.aiConfidence < 0.7);
                break;
            case 'needs-review':
                filtered = reviewItems.filter(item => item.status === 'needs-review');
                break;
            case 'disputed':
                filtered = reviewItems.filter(item => item.status === 'disputed');
                break;
            default:
                filtered = reviewItems;
        }

        const reviewList = this.mainLayout.element.querySelector('#review-list');
        if (filtered.length === 0) {
            reviewList.innerHTML = this.createEmptyReviewState();
        } else {
            reviewList.innerHTML = filtered.map(item => this.createReviewItem(item)).join('');
        }

        this.updateReviewStatistics(filtered);
    }

    /**
     * 更新复核统计
     */
    updateReviewStatistics(items) {
        const pendingCount = items.filter(item => item.needsReview).length;
        const completedCount = items.filter(item => !item.needsReview).length;

        const pendingEl = this.mainLayout.element.querySelector('#pending-count');
        const completedEl = this.mainLayout.element.querySelector('#completed-count');

        if (pendingEl) pendingEl.textContent = pendingCount;
        if (completedEl) completedEl.textContent = completedCount;
    }

    /**
     * 打开复核面板
     */
    openReview(reviewId) {
        const reviewItems = this.getReviewItems();
        const item = reviewItems.find(r => r.id === reviewId);

        if (item) {
            // 准备复核数据
            const reviewData = {
                ...item,
                standardAnswer: 'x = 6, y = 4', // 应该从题目数据获取
                studentAnswer: '通过OCR识别的学生答案内容',
                aiFeedback: 'AI评分反馈信息',
                gradingDetails: [
                    { criterion: '正确列出方程组', score: 3 },
                    { criterion: '正确求解方程', score: 2 },
                    { criterion: '验证结果', score: 1 },
                    { criterion: '答案完整', score: 0 }
                ]
            };

            this.manualReviewPanel.show(reviewData);
        }
    }

    /**
     * 处理复核完成
     */
    handleReviewCompleted(reviewResult) {
        
        this.showSuccess('复核结果已保存');

        // 更新复核列表
        this.updateReviewList();

        // 通知评分处理器
        if (this.gradingProcessor) {
            this.gradingProcessor.emit('manual-review-completed', reviewResult);
        }
    }

    /**
     * 更新复核历史
     */
    updateReviewHistory(history) {
        
        // 可以在这里添加历史记录展示功能
    }

    /**
     * 开始批量复核
     */
    startBatchReview() {
        const reviewItems = this.getReviewItems().filter(item => item.needsReview);

        if (reviewItems.length === 0) {
            this.showInfo('暂无需复核的试卷');
            return;
        }

        this.showInfo(`开始批量复核 ${reviewItems.length} 份试卷`);

        // 这里可以实现批量复核逻辑
        // 例如：逐个打开复核面板，或者提供批量调整界面
    }

    /**
     * 导出复核记录
     */
    exportReviewRecords() {
        const history = this.manualReviewPanel.getHistory();

        if (history.length === 0) {
            this.showInfo('暂无复核记录可导出');
            return;
        }

        // 创建CSV数据
        const csvData = this.createCSVFromHistory(history);
        this.downloadCSV(csvData, '复核记录_' + new Date().toISOString().slice(0, 10) + '.csv');

        this.showSuccess('复核记录已导出');
    }

    /**
     * 创建CSV数据
     */
    createCSVFromHistory(history) {
        const headers = [
            '学生姓名',
            '学号',
            '题号',
            '原分数',
            '调整后分数',
            '调整原因',
            '详细说明',
            '复核时间',
            '复核人'
        ];
        const rows = history.map(record => [
            record.studentName,
            record.studentId,
            record.questionNumber,
            record.originalScore,
            record.adjustedScore,
            record.adjustmentReason,
            record.detailedReason,
            new Date(record.timestamp).toLocaleString(),
            record.reviewer
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * 下载CSV文件
     */
    downloadCSV(csvData, filename) {
        const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    /**
     * 显示复核统计
     */
    showReviewStatistics() {
        const stats = this.manualReviewPanel.getStatistics();

        const message = `
复核统计：
- 总复核数：${stats.totalReviews}
- 已调整：${stats.adjustedReviews}
- 已确认：${stats.confirmedReviews}
- 调整率：${stats.adjustmentRate}%
- 平均调整分数：${stats.averageAdjustment.toFixed(1)}分
        `;

        alert(message.trim());
    }

    /**
     * 清理资源
     */
    cleanup() {
        

        if (this.mainLayout) {
            this.mainLayout.destroy();
        }

        if (this.toastNotifier) {
            this.toastNotifier.destroy();
        }

        if (this.gradingProcessor) {
            this.gradingProcessor.destroy();
        }

        if (this.manualReviewPanel) {
            this.manualReviewPanel.destroy();
        }

        if (this.toggleButton) {
            this.toggleButton.remove();
        }

        window.zhixueExtensionInjected = false;
    }
}

// 添加必要的样式
function addGlobalStyles() {
    const style = createElement('style', {
        textContent: `
            .zhixue-ai-extension {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .zhixue-ai-toggle {
                animation: slideInRight 0.3s ease;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .zhixue-ai-extension {
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
        `
    });
    document.head.appendChild(style);
}

// 初始化
function initialize() {
    // 避免重复初始化
    if (window.zhixueExtensionInitialized) {
        
        return;
    }

    window.zhixueExtensionInitialized = true;
    addGlobalStyles();

    // 创建集成实例
    window.zhixueAIIntegration = new ZhixueIntegration();

    
}

// 启动
initialize();
