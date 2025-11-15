/**
 * UI Module Entry Point
 * UI模块入口 - 负责初始化和启动整个用户界面
 */

import { MainLayout } from './components/main-layout.js';
import { HeaderNavigation } from './components/header-navigation.js';
import { AIScoreDisplay } from './components/ai-score-display.js';
import { Charts } from './components/charts.js';
import { createElement } from '../utils/dom-utils.js';
import { EventEmitter } from '../utils/event-emitter.js';

export class UIManager extends EventEmitter {
    constructor() {
        super();
        this.container = null;
        this.mainLayout = null;
        this.isInitialized = false;
    }

    /**
     * 初始化UI管理器
     */
    async init(containerId = 'app') {
        if (this.isInitialized) {
            // console.warn('UI管理器已经初始化');
            return;
        }

        try {
            // 获取容器元素
            this.container = document.getElementById(containerId);
            if (!this.container) {
                throw new Error(`找不到容器元素: ${containerId}`);
            }

            // 创建主布局
            this.mainLayout = MainLayout();

            // 清空容器并添加主布局
            this.container.innerHTML = '';
            this.container.appendChild(this.mainLayout.getElement());

            // 绑定全局事件
            this.bindGlobalEvents();

            // 初始化图表（延迟加载以优化性能）
            setTimeout(() => {
                this.initCharts();
            }, 100);

            this.isInitialized = true;

            this.emit('ui-initialized');
        } catch (error) {
            // console.error('❌ UI管理器初始化失败:', error);
            this.showError(error.message);
            throw error;
        }
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        if (!this.mainLayout) return;

        // 监听布局事件
        this.mainLayout.on('tab-changed', data => {
            this.handleTabChange(data.tab);
        });

        // 监听文件上传事件
        this.mainLayout.on('files-uploaded', data => {
            this.handleFileUpload(data.files);
        });

        // 监听AI评分事件
        this.mainLayout.on('ai-grading-completed', data => {
            this.handleAIGradingCompleted(data.scoreData);
        });

        // 监听评分确认事件
        this.mainLayout.on('score-confirmed', data => {
            this.handleScoreConfirmed(data);
        });

        // 监听复核事件
        this.mainLayout.on('batch-review-started', data => {
            this.handleBatchReviewStarted(data);
        });

        // 监听图表事件
        this.mainLayout.on('review-statistics-viewed', () => {
            this.handleReviewStatisticsViewed();
        });
    }

    /**
     * 初始化图表组件
     */
    async initCharts() {
        try {
            const chartsComponent = this.mainLayout.components.charts;
            if (chartsComponent) {
                await chartsComponent.mount();

                this.emit('charts-initialized');
            }
        } catch (error) {
            // console.error('❌ 图表组件初始化失败:', error);
        }
    }

    /**
     * 处理标签切换
     */
    handleTabChange(tabName) {
        switch (tabName) {
        case 'ai-grading':
            this.emit('ai-grading-tab-activated');
            break;
        case 'manual-review':
            this.emit('manual-review-tab-activated');
            break;
        case 'data-analysis':
            this.emit('data-analysis-tab-activated');
            // 确保图表已初始化
            this.initCharts();
            break;
        }
    }

    /**
     * 处理文件上传
     */
    handleFileUpload(files) {
        // 验证文件类型和大小
        const validFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB限制
            return isImage && isValidSize;
        });

        if (validFiles.length !== files.length) {
            alert(`过滤了 ${files.length - validFiles.length} 个无效文件`);
        }

        this.emit('files-uploaded', { files: validFiles });
    }

    /**
     * 处理AI评分完成
     */
    handleAIGradingCompleted(scoreData) {
        // 这里可以添加评分数据的后续处理逻辑
        // 例如:保存到本地存储、发送到服务器等

        this.emit('ai-grading-completed', { scoreData });
    }

    /**
     * 处理评分确认
     */
    handleScoreConfirmed(data) {
        // 这里可以添加评分确认的处理逻辑
        // 例如:保存到数据库、更新统计等

        this.emit('score-confirmed', data);
    }

    /**
     * 处理批量复核开始
     */
    handleBatchReviewStarted(data) {
        // 这里可以添加批量复核的处理逻辑

        this.emit('batch-review-started', data);
    }

    /**
     * 处理复核统计查看
     */
    handleReviewStatisticsViewed() {
        // 切换到数据分析标签以显示详细统计
        if (this.mainLayout) {
            this.mainLayout.switchTab('data-analysis');
        }

        this.emit('review-statistics-viewed');
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        const errorElement = createElement('div', {
            className: 'ui-error',
            innerHTML: `
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">
                        <h3>UI加载失败</h3>
                        <p>${message}</p>
                    </div>
                </div>
            `
        });

        if (this.container) {
            this.container.innerHTML = '';
            this.container.appendChild(errorElement);
        }

        // 添加错误样式
        const style = createElement('style', {
            textContent: `
                .ui-error {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    padding: 24px;
                }

                .error-content {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 24px;
                    max-width: 500px;
                }

                .error-icon {
                    font-size: 32px;
                    color: #dc2626;
                }

                .error-message h3 {
                    margin: 0 0 8px 0;
                    color: #dc2626;
                    font-size: 18px;
                }

                .error-message p {
                    margin: 0;
                    color: #7f1d1d;
                    font-size: 14px;
                }
            `
        });
        document.head.appendChild(style);
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const loadingElement = createElement('div', {
            className: 'ui-loading',
            innerHTML: `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>正在加载界面...</p>
                </div>
            `
        });

        if (this.container) {
            this.container.innerHTML = '';
            this.container.appendChild(loadingElement);
        }

        // 添加加载样式
        const style = createElement('style', {
            textContent: `
                .ui-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    padding: 24px;
                }

                .loading-content {
                    text-align: center;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f4f6;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                .loading-content p {
                    margin: 0;
                    color: #6b7280;
                    font-size: 14px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `
        });
        document.head.appendChild(style);
    }

    /**
     * 销毁UI管理器
     */
    destroy() {
        if (this.mainLayout) {
            this.mainLayout.destroy();
            this.mainLayout = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.isInitialized = false;
        this.emit('ui-destroyed');
    }

    /**
     * 获取当前标签
     */
    getCurrentTab() {
        return this.mainLayout ? this.mainLayout.getCurrentTab() : null;
    }

    /**
     * 切换到指定标签
     */
    switchTab(tabName) {
        if (this.mainLayout) {
            this.mainLayout.switchTab(tabName);
        }
    }

    /**
     * 更新头部状态
     */
    updateHeaderStatus(statusType, status, message) {
        if (this.mainLayout && this.mainLayout.components.header) {
            this.mainLayout.components.header.updateStatus(statusType, status, message);
        }
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info', duration = 3000) {
        // 这里可以集成Toast通知系统
        // console.log removed

        // 简单的浏览器通知作为备选
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('AI智能阅卷助手', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    /**
     * 获取UI状态
     */
    getUIState() {
        return {
            isInitialized: this.isInitialized,
            currentTab: this.getCurrentTab(),
            components: {
                header: !!this.mainLayout?.components.header,
                aiScoreDisplay: !!this.mainLayout?.components.aiScoreDisplay,
                charts: !!this.mainLayout?.components.charts
            }
        };
    }
}

// 创建全局UI管理器实例
export const uiManager = UIManager();

// 自动初始化（如果存在app容器）
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('app')) {
            uiManager
                .init('app')
                .then(() => {})
                .catch(error => {
                    // console.error('❌ UI启动失败:', error);
                });
        }
    });
}

// 导出主要组件供外部使用
export { MainLayout, HeaderNavigation, AIScoreDisplay, Charts };
