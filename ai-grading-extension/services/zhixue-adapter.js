/**
 * 智学网适配器
 * ZhiXue Net Adapter - 负责智学网页面的检测、元素识别和分数同步
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { createElement, waitForElement } from '../utils/dom-utils.js';
import { Logger } from '../utils/logger.js';

export class ZhiXueAdapter extends EventEmitter {
    constructor() {
        super();
        this.logger = new Logger('ZhiXueAdapter');
        this.isActive = false;
        this.currentPage = null;
        this.pageElements = {};
        this.observers = [];
        this.retryCount = 0;
        this.maxRetries = 3;

        // 智学网页面类型定义
        this.pageTypes = {
            GRADING: 'grading', // 阅卷页面
            REVIEW: 'review', // 复核页面
            LIST: 'list', // 列表页面
            UNKNOWN: 'unknown'
        };

        // 元素选择器数据库（基于常见模式）
        this.elementSelectors = {
            answerCard: [
                '.answer-card', '.question-paper', '.student-answer',
                '[data-answer]', '.answer-area', '.question-content'
            ],
            scoreInput: [
                'input[type="number"]', '.score-input', '[data-score]',
                '.mark-input', 'input[name*="score"]', '.points-input'
            ],
            submitButton: [
                'button[type="submit"]', '.submit-btn', '.save-score',
                '[data-action="submit"]', '.grade-submit', 'button:contains("提交")'
            ],
            studentInfo: [
                '.student-name', '.student-id', '.student-info',
                '[data-student]', '.candidate-info', '.student-number'
            ],
            questionInfo: [
                '.question-number', '.question-title', '[data-question]',
                '.item-number', '.question-index', '.q-number'
            ]
        };
    }

    /**
     * 初始化适配器
     */
    async init() {
        this.logger.info('初始化智学网适配器');

        try {
            // 检测当前页面类型
            await this.detectPageType();

            // 开始监控页面变化
            this.startPageMonitoring();

            // 如果当前页面是阅卷页面,立即进行检测
            if (this.currentPage === this.pageTypes.GRADING) {
                await this.detectPageElements();
            }

            this.isActive = true;
            this.emit('adapter-initialized', { pageType: this.currentPage });
            this.logger.info('智学网适配器初始化完成', { pageType: this.currentPage });
        } catch (error) {
            this.logger.error('适配器初始化失败', error);
            this.emit('adapter-error', { error: error.message });
            throw error;
        }
    }

    /**
     * 检测当前页面类型
     */
    async detectPageType() {
        this.logger.info('检测页面类型');

        const url = window.location.href;
        const title = document.title;
        const bodyText = document.body.textContent || '';

        // URL模式匹配
        if (url.includes('grade') || url.includes('mark') || url.includes('score')) {
            this.currentPage = this.pageTypes.GRADING;
        } else if (url.includes('review') || url.includes('check')) {
            this.currentPage = this.pageTypes.REVIEW;
        } else if (url.includes('list') || url.includes('manage')) {
            this.currentPage = this.pageTypes.LIST;
        } else {
            // 内容分析
            const gradingKeywords = ['阅卷', '评分', '打分', '批改', 'mark', 'grade', 'score'];
            const hasGradingKeyword = gradingKeywords.some(keyword =>
                bodyText.includes(keyword) || title.includes(keyword)
            );

            if (hasGradingKeyword) {
                this.currentPage = this.pageTypes.GRADING;
            } else {
                this.currentPage = this.pageTypes.UNKNOWN;
            }
        }

        this.logger.info('页面类型检测完成', {
            url,
            title,
            pageType: this.currentPage
        });
    }

    /**
     * 检测页面元素
     */
    async detectPageElements() {
        this.logger.info('开始检测页面元素');

        this.pageElements = {};
        let detectedCount = 0;

        // 遍历所有元素类型
        for (const [elementType, selectors] of Object.entries(this.elementSelectors)) {
            this.logger.debug(`检测元素类型: ${elementType}`);

            for (const selector of selectors) {
                try {
                    let elements = [];

                    // 尝试不同的选择器策略
                    if (selector.startsWith('button:contains')) {
                        // 特殊处理包含文本的按钮选择器
                        const text = selector.match(/"([^"]+)"/)[1];
                        elements = Array.from(document.querySelectorAll('button')).filter(
                            btn => btn.textContent.includes(text)
                        );
                    } else {
                        // 标准CSS选择器
                        elements = Array.from(document.querySelectorAll(selector));
                    }

                    if (elements.length > 0) {
                        this.pageElements[elementType] = {
                            elements,
                            selector,
                            count: elements.length,
                            confidence: this.calculateConfidence(elements, selector)
                        };

                        detectedCount++;
                        this.logger.debug(`找到${elementType}元素`, {
                            selector,
                            count: elements.length,
                            confidence: this.pageElements[elementType].confidence
                        });
                        break; // 找到有效选择器后跳出循环
                    }
                } catch (error) {
                    this.logger.warn(`选择器检测失败: ${selector}`, error);
                }
            }
        }

        this.logger.info('页面元素检测完成', {
            detectedTypes: Object.keys(this.pageElements).length,
            totalTypes: Object.keys(this.elementSelectors).length,
            details: this.pageElements
        });

        this.emit('elements-detected', {
            detectedCount,
            totalCount: Object.keys(this.elementSelectors).length,
            elements: this.pageElements
        });

        return this.pageElements;
    }

    /**
     * 计算元素检测的置信度
     */
    calculateConfidence(elements, selector) {
        let confidence = 0.5; // 基础置信度

        // 基于元素数量
        if (elements.length === 1) {
            confidence += 0.2; // 唯一元素更可信
        } else if (elements.length > 1 && elements.length <= 5) {
            confidence += 0.1; // 合理数量的元素
        }

        // 基于选择器类型
        if (selector.includes('data-')) {
            confidence += 0.15; // data属性通常更稳定
        }
        if (selector.includes('id')) {
            confidence += 0.2; // ID选择器通常唯一且稳定
        }
        if (selector.includes('class') && !selector.includes('ng-')) {
            confidence += 0.1; // 避免Angular动态class
        }

        // 基于元素可见性和位置
        const visibleElements = elements.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 &&
                   rect.top >= 0 && rect.left >= 0;
        });

        if (visibleElements.length === elements.length) {
            confidence += 0.1; // 所有元素都可见
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * 捕捉答题卡图片
     */
    async captureAnswerCard() {
        this.logger.info('开始捕捉答题卡图片');

        try {
            const answerCardElement = this.pageElements.answerCard;
            if (!answerCardElement || !answerCardElement.elements[0]) {
                throw new Error('未找到答题卡元素');
            }

            const element = answerCardElement.elements[0];

            // 使用Chrome扩展API截图
            const rect = element.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            const captureConfig = {
                format: 'png',
                quality: 90,
                area: {
                    x: Math.round(rect.left + scrollLeft),
                    y: Math.round(rect.top + scrollTop),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                }
            };

            // 如果是Chrome扩展环境
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                const dataUrl = await chrome.tabs.captureVisibleTab(null, captureConfig);

                this.logger.info('答题卡图片捕捉完成', {
                    width: rect.width,
                    height: rect.height,
                    dataUrlLength: dataUrl.length
                });

                this.emit('image-captured', {
                    dataUrl,
                    dimensions: {
                        width: rect.width,
                        height: rect.height
                    },
                    elementInfo: {
                        selector: answerCardElement.selector,
                        confidence: answerCardElement.confidence
                    }
                });

                return dataUrl;
            } else {
                // 浏览器环境,使用html2canvas作为备选
                this.logger.warn('Chrome扩展API不可用,使用备选方案');
                return await this.captureWithHtml2Canvas(element);
            }
        } catch (error) {
            this.logger.error('答题卡图片捕捉失败', error);
            this.emit('capture-error', { error: error.message });
            throw error;
        }
    }

    /**
     * 使用html2canvas备选方案
     */
    async captureWithHtml2Canvas(element) {
        try {
            // 动态加载html2canvas
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

            return new Promise((resolve, reject) => {
                script.onload = async() => {
                    try {
                        const canvas = await window.html2canvas(element, {
                            backgroundColor: '#ffffff',
                            scale: 2,
                            useCORS: true,
                            allowTaint: true
                        });

                        const dataUrl = canvas.toDataURL('image/png', 0.9);
                        resolve(dataUrl);
                    } catch (error) {
                        reject(error);
                    }
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (error) {
            throw new Error(`html2canvas失败: ${error.message}`);
        }
    }

    /**
     * 同步分数到智学网
     */
    async syncScore(scoreData) {
        this.logger.info('开始同步分数到智学网', scoreData);

        try {
            const scoreInput = this.pageElements.scoreInput;
            if (!scoreInput || !scoreInput.elements[0]) {
                throw new Error('未找到分数输入框');
            }

            const submitButton = this.pageElements.submitButton;
            if (!submitButton || !submitButton.elements[0]) {
                this.logger.warn('未找到提交按钮,可能需要手动提交');
            }

            // 填充分数
            const scoreInputElement = scoreInput.elements[0];
            scoreInputElement.focus();
            scoreInputElement.select();

            // 触发输入事件
            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });

            // 设置分数值
            scoreInputElement.value = scoreData.totalScore.toString();
            scoreInputElement.dispatchEvent(inputEvent);
            scoreInputElement.dispatchEvent(changeEvent);

            // 触发可能的React/Vue等框架的更新
            this.triggerFrameworkUpdate(scoreInputElement);

            this.logger.info('分数同步完成', {
                score: scoreData.totalScore,
                confidence: scoreData.confidence
            });

            this.emit('score-synced', {
                score: scoreData.totalScore,
                confidence: scoreData.confidence,
                elementInfo: scoreInput
            });

            // 自动提交（如果找到提交按钮）
            if (submitButton && submitButton.elements[0]) {
                setTimeout(() => {
                    this.autoSubmitScore(submitButton.elements[0]);
                }, 500);
            }
        } catch (error) {
            this.logger.error('分数同步失败', error);
            this.emit('sync-error', { error: error.message });
            throw error;
        }
    }

    /**
     * 触发前端框架更新
     */
    triggerFrameworkUpdate(element) {
        // React
        if (element._valueTracker) {
            element._valueTracker.setValue(element.value);
        }

        // Vue
        if (element.__v_model) {
            element.__v_model.setValue(element.value);
        }

        // Angular
        if (window.ngModel) {
            const angularElement = window.ngModel.get(element);
            if (angularElement) {
                angularElement.$setViewValue(element.value);
            }
        }
    }

    /**
     * 自动提交分数
     */
    async autoSubmitScore(submitButton) {
        this.logger.info('自动提交分数');

        try {
            // 尝试不同的点击方式
            const clickMethods = [
                () => submitButton.click(),
                () => {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    submitButton.dispatchEvent(clickEvent);
                },
                () => submitButton.focus(),
                () => {
                    if (submitButton.form) {
                        submitButton.form.submit();
                    }
                }
            ];

            for (const method of clickMethods) {
                try {
                    method();
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // 检查是否成功提交
                    if (this.isSubmitSuccessful()) {
                        this.logger.info('分数自动提交成功');
                        this.emit('score-submitted', { success: true });
                        return;
                    }
                } catch (error) {
                    this.logger.warn('点击方法失败', error);
                }
            }

            this.logger.warn('自动提交失败,可能需要手动提交');
            this.emit('score-submitted', { success: false, reason: 'auto-submit-failed' });
        } catch (error) {
            this.logger.error('自动提交异常', error);
            this.emit('score-submitted', { success: false, error: error.message });
        }
    }

    /**
     * 检查提交是否成功
     */
    isSubmitSuccessful() {
        // 检查是否有成功提示
        const successIndicators = [
            '.success-message', '.success-toast', '.success-notification',
            '[data-success]', '.score-saved', '.submit-success'
        ];

        for (const selector of successIndicators) {
            const element = document.querySelector(selector);
            if (element && element.textContent.includes('成功')) {
                return true;
            }
        }

        // 检查页面是否发生变化
        const currentUrl = window.location.href;
        const hasRedirect = currentUrl !== this.lastUrl;
        this.lastUrl = currentUrl;

        return hasRedirect;
    }

    /**
     * 开始页面监控
     */
    startPageMonitoring() {
        this.logger.info('开始页面监控');

        // 监控URL变化
        this.lastUrl = window.location.href;

        // 使用MutationObserver监控DOM变化
        const observer = new MutationObserver((mutations) => {
            this.handleDomChanges(mutations);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'style']
        });

        this.observers.push(observer);

        // 监控页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handlePageVisible();
            }
        });

        // 定期检测页面类型（每5秒）
        setInterval(() => {
            this.periodicPageCheck();
        }, 5000);

        this.logger.info('页面监控已启动');
    }

    /**
     * 处理DOM变化
     */
    handleDomChanges(mutations) {
        // 检查是否有相关元素被添加
        const relevantChanges = mutations.some(mutation => {
            return Array.from(mutation.addedNodes).some(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node;
                    const hasRelevantClass = Object.values(this.elementSelectors)
                        .flat()
                        .some(selector => {
                            if (selector.includes('.')) {
                                const className = selector.split('.')[1];
                                return element.classList && element.classList.contains(className);
                            }
                            return false;
                        });

                    return hasRelevantClass;
                }
                return false;
            });
        });

        if (relevantChanges) {
            this.logger.info('检测到相关DOM变化,重新检测元素');
            setTimeout(() => this.detectPageElements(), 1000);
        }
    }

    /**
     * 处理页面可见
     */
    handlePageVisible() {
        this.logger.info('页面变为可见,重新检测');
        this.detectPageType();
        if (this.currentPage === this.pageTypes.GRADING) {
            this.detectPageElements();
        }
    }

    /**
     * 定期检查页面类型
     */
    periodicPageCheck() {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
            this.logger.info('URL发生变化,重新检测页面类型');
            this.detectPageType();
            if (this.currentPage === this.pageTypes.GRADING) {
                this.detectPageElements();
            }
        }
    }

    /**
     * 获取当前检测到的元素
     */
    getDetectedElements() {
        return this.pageElements;
    }

    /**
     * 获取元素信息
     */
    getElementInfo(elementType) {
        return this.pageElements[elementType] || null;
    }

    /**
     * 检查是否已检测到指定元素
     */
    hasElement(elementType) {
        return !!this.pageElements[elementType];
    }

    /**
     * 获取适配器状态
     */
    getStatus() {
        return {
            isActive: this.isActive,
            currentPage: this.currentPage,
            detectedElements: Object.keys(this.pageElements),
            elementsCount: Object.keys(this.pageElements).length,
            totalElementTypes: Object.keys(this.elementSelectors).length
        };
    }

    /**
     * 销毁适配器
     */
    destroy() {
        this.logger.info('销毁智学网适配器');

        this.isActive = false;

        // 停止所有观察者
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        // 清理事件监听器
        document.removeEventListener('visibilitychange', this.handlePageVisible);

        this.pageElements = {};
        this.currentPage = null;

        this.emit('adapter-destroyed');
        this.logger.info('智学网适配器已销毁');
    }
}
