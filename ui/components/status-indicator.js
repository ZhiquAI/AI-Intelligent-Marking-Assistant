/**
 * 智学AI - 状态指示器组件
 * 提供系统状态、连接状态和操作进度的可视化指示
 */

import { EventEmitter } from '../utils/event-manager.js';
import { TemplateLoader } from '../utils/template-loader.js';
import { safeSetHTML, safeSetText, safeCreateElement } from '../utils/safe-html.js';
import { validateData, escapeHtml } from '../utils/security-utils.js';

export class StatusIndicator extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            position: 'top-right',
            theme: 'auto',
            showProgress: true,
            showTooltips: true,
            maxVisible: 5,
            autoHide: true,
            autoHideDelay: 5000,
            animationDuration: 300,
            ...options
        };

        // 核心组件
        this.templateLoader = new TemplateLoader();

        // 状态管理
        this.isVisible = false;
        this.notifications = [];
        this.activeStatuses = new Map();
        this.progressBars = new Map();

        // 缓存DOM元素
        this.container = null;
        this.elements = {};

        // 初始化
        this.init();
    }

    init() {
        try {
            console.log('状态指示器初始化中...');
            this.createContainer();
            this.setupEventListeners();
            this.updatePosition();
            console.log('状态指示器初始化完成');
            this.emit('initialized');
        } catch (error) {
            console.error('状态指示器初始化失败:', error);
            this.emit('error', error);
        }
    }

    createContainer() {
        this.container = safeCreateElement('div', {
            id: 'zhixue-status-indicator',
            className: `zhixue-status-indicator position-${this.options.position} theme-${this.options.theme}`,
            style: {
                position: 'fixed',
                zIndex: '2147483646',
                pointerEvents: 'none'
            }
        });

        // 创建通知容器
        this.elements.notificationsContainer = safeCreateElement('div', {
            className: 'notifications-container'
        });

        // 创建状态容器
        this.elements.statusContainer = safeCreateElement('div', {
            className: 'status-container'
        });

        // 创建进度容器
        this.elements.progressContainer = safeCreateElement('div', {
            className: 'progress-container'
        });

        this.container.appendChild(this.elements.notificationsContainer);
        this.container.appendChild(this.elements.statusContainer);
        this.container.appendChild(this.elements.progressContainer);

        document.body.appendChild(this.container);
    }

    setupEventListeners() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.updatePosition();
        });

        // 监听主题变化
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', () => {
                this.updateTheme();
            });
        }

        // 监听滚动事件
        window.addEventListener('scroll', () => {
            this.updatePosition();
        }, { passive: true });
    }

    /**
     * 显示通知消息
     * @param {Object} options - 通知选项
     * @param {string} options.message - 消息内容
     * @param {string} options.type - 消息类型 (success, error, warning, info)
     * @param {number} options.duration - 显示时长 (毫秒)
     * @param {boolean} options.closable - 是否可关闭
     * @param {string} options.title - 标题
     * @param {Function} options.onClick - 点击回调
     */
    showNotification(options) {
        const validation = validateData(options, 'object');
        if (!validation.valid) {
            throw new Error(`通知选项无效: ${validation.error}`);
        }

        const notification = {
            id: this.generateId(),
            message: escapeHtml(options.message || ''),
            type: options.type || 'info',
            duration: options.duration ?? this.options.autoHideDelay,
            closable: options.closable ?? true,
            title: options.title ? escapeHtml(options.title) : '',
            onClick: options.onClick || null,
            timestamp: Date.now(),
            visible: true
        };

        // 添加到通知列表
        this.notifications.unshift(notification);

        // 限制最大可见数量
        if (this.notifications.length > this.options.maxVisible) {
            const hidden = this.notifications.pop();
            if (hidden.timer) {
                clearTimeout(hidden.timer);
            }
        }

        // 创建通知元素
        const element = this.createNotificationElement(notification);
        this.elements.notificationsContainer.appendChild(element);
        notification.element = element;

        // 显示动画
        this.showElement(element);

        // 设置自动隐藏
        if (notification.duration > 0) {
            notification.timer = setTimeout(() => {
                this.hideNotification(notification.id);
            }, notification.duration);
        }

        this.emit('notificationShown', notification);
        return notification.id;
    }

    /**
     * 隐藏通知
     * @param {string} notificationId - 通知ID
     */
    hideNotification(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification || !notification.visible) return;

        notification.visible = false;

        // 清除定时器
        if (notification.timer) {
            clearTimeout(notification.timer);
            notification.timer = null;
        }

        // 隐藏动画
        this.hideElement(notification.element, () => {
            // 移除元素
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }

            // 从列表中移除
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }

            this.emit('notificationHidden', notification);
        });
    }

    /**
     * 创建通知元素
     * @param {Object} notification - 通知对象
     * @returns {HTMLElement} 通知元素
     */
    createNotificationElement(notification) {
        const element = safeCreateElement('div', {
            className: `status-notification ${notification.type}`,
            'data-id': notification.id,
            'data-type': notification.type
        });

        if (notification.title) {
            const titleElement = safeCreateElement('div', {
                className: 'notification-title'
            });
            safeSetText(titleElement, notification.title);
            element.appendChild(titleElement);
        }

        const messageElement = safeCreateElement('div', {
            className: 'notification-message'
        });
        safeSetText(messageElement, notification.message);
        element.appendChild(messageElement);

        if (notification.closable) {
            const closeBtn = safeCreateElement('button', {
                className: 'notification-close',
                'aria-label': '关闭通知'
            });
            safeSetText(closeBtn, '×');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideNotification(notification.id);
            });
            element.appendChild(closeBtn);
        }

        // 添加点击事件
        if (notification.onClick) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => {
                notification.onClick(notification);
                this.hideNotification(notification.id);
            });
        }

        return element;
    }

    /**
     * 显示状态指示器
     * @param {string} statusId - 状态ID
     * @param {Object} options - 状态选项
     */
    showStatus(statusId, options = {}) {
        const status = {
            id: statusId,
            type: options.type || 'info',
            message: options.message || '',
            icon: options.icon || this.getDefaultIcon(options.type),
            tooltip: options.tooltip || '',
            pulsing: options.pulsing || false,
            visible: true,
            timestamp: Date.now()
        };

        // 更新或添加状态
        this.activeStatuses.set(statusId, status);

        let element = this.elements.statusContainer.querySelector(`[data-status-id="${statusId}"]`);
        if (!element) {
            element = this.createStatusElement(status);
            this.elements.statusContainer.appendChild(element);
        } else {
            this.updateStatusElement(element, status);
        }

        status.element = element;

        this.showElement(element);
        this.emit('statusShown', status);
        return statusId;
    }

    /**
     * 隐藏状态指示器
     * @param {string} statusId - 状态ID
     */
    hideStatus(statusId) {
        const status = this.activeStatuses.get(statusId);
        if (!status || !status.visible) return;

        status.visible = false;

        const element = this.elements.statusContainer.querySelector(`[data-status-id="${statusId}"]`);
        if (element) {
            this.hideElement(element, () => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.activeStatuses.delete(statusId);
                this.emit('statusHidden', status);
            });
        }
    }

    /**
     * 更新状态指示器
     * @param {string} statusId - 状态ID
     * @param {Object} updates - 更新内容
     */
    updateStatus(statusId, updates) {
        const status = this.activeStatuses.get(statusId);
        if (!status) return;

        Object.assign(status, updates);

        const element = this.elements.statusContainer.querySelector(`[data-status-id="${statusId}"]`);
        if (element) {
            this.updateStatusElement(element, status);
        }

        this.emit('statusUpdated', status);
    }

    /**
     * 创建状态元素
     * @param {Object} status - 状态对象
     * @returns {HTMLElement} 状态元素
     */
    createStatusElement(status) {
        const element = safeCreateElement('div', {
            className: `status-indicator ${status.type}`,
            'data-status-id': status.id
        });

        if (status.tooltip && this.options.showTooltips) {
            element.title = escapeHtml(status.tooltip);
        }

        if (status.pulsing) {
            element.classList.add('pulsing');
        }

        const iconElement = safeCreateElement('span', {
            className: 'status-icon'
        });
        safeSetText(iconElement, status.icon);
        element.appendChild(iconElement);

        if (status.message) {
            const messageElement = safeCreateElement('span', {
                className: 'status-message'
            });
            safeSetText(messageElement, status.message);
            element.appendChild(messageElement);
        }

        return element;
    }

    /**
     * 更新状态元素
     * @param {HTMLElement} element - 状态元素
     * @param {Object} status - 状态对象
     */
    updateStatusElement(element, status) {
        element.className = `status-indicator ${status.type}`;
        if (status.pulsing) {
            element.classList.add('pulsing');
        } else {
            element.classList.remove('pulsing');
        }

        if (status.tooltip && this.options.showTooltips) {
            element.title = escapeHtml(status.tooltip);
        }

        const iconElement = element.querySelector('.status-icon');
        if (iconElement) {
            safeSetText(iconElement, status.icon);
        }

        const messageElement = element.querySelector('.status-message');
        if (status.message) {
            if (messageElement) {
                safeSetText(messageElement, status.message);
            } else {
                const newMessageElement = safeCreateElement('span', {
                    className: 'status-message'
                });
                safeSetText(newMessageElement, status.message);
                element.appendChild(newMessageElement);
            }
        } else if (messageElement) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }

    /**
     * 显示进度条
     * @param {string} progressId - 进度ID
     * @param {Object} options - 进度选项
     */
    showProgress(progressId, options = {}) {
        const progress = {
            id: progressId,
            value: options.value || 0,
            max: options.max || 100,
            label: options.label || '',
            color: options.color || this.getDefaultColor(options.type),
            type: options.type || 'info',
            showPercentage: options.showPercentage ?? true,
            visible: true,
            timestamp: Date.now()
        };

        // 更新或添加进度条
        this.progressBars.set(progressId, progress);

        let element = this.elements.progressContainer.querySelector(`[data-progress-id="${progressId}"]`);
        if (!element) {
            element = this.createProgressElement(progress);
            this.elements.progressContainer.appendChild(element);
        } else {
            this.updateProgressElement(element, progress);
        }

        progress.element = element;

        this.showElement(element);
        this.emit('progressShown', progress);
        return progressId;
    }

    /**
     * 更新进度条
     * @param {string} progressId - 进度ID
     * @param {number} value - 进度值
     * @param {Object} options - 其他选项
     */
    updateProgress(progressId, value, options = {}) {
        const progress = this.progressBars.get(progressId);
        if (!progress) return;

        progress.value = Math.min(value, progress.max);
        if (options.label) progress.label = options.label;
        if (options.color) progress.color = options.color;

        const element = this.elements.progressContainer.querySelector(`[data-progress-id="${progressId}"]`);
        if (element) {
            this.updateProgressElement(element, progress);
        }

        this.emit('progressUpdated', progress);
    }

    /**
     * 隐藏进度条
     * @param {string} progressId - 进度ID
     */
    hideProgress(progressId) {
        const progress = this.progressBars.get(progressId);
        if (!progress || !progress.visible) return;

        progress.visible = false;

        const element = this.elements.progressContainer.querySelector(`[data-progress-id="${progressId}"]`);
        if (element) {
            this.hideElement(element, () => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                this.progressBars.delete(progressId);
                this.emit('progressHidden', progress);
            });
        }
    }

    /**
     * 创建进度元素
     * @param {Object} progress - 进度对象
     * @returns {HTMLElement} 进度元素
     */
    createProgressElement(progress) {
        const element = safeCreateElement('div', {
            className: `progress-indicator ${progress.type}`,
            'data-progress-id': progress.id
        });

        if (progress.label) {
            const labelElement = safeCreateElement('div', {
                className: 'progress-label'
            });
            safeSetText(labelElement, progress.label);
            element.appendChild(labelElement);
        }

        const progressBarContainer = safeCreateElement('div', {
            className: 'progress-bar-container'
        });

        const progressBar = safeCreateElement('div', {
            className: 'progress-bar'
        });

        if (progress.color) {
            progressBar.style.backgroundColor = progress.color;
        }

        progressBarContainer.appendChild(progressBar);
        element.appendChild(progressBarContainer);

        if (progress.showPercentage) {
            const percentageElement = safeCreateElement('div', {
                className: 'progress-percentage'
            });
            const percentage = Math.round((progress.value / progress.max) * 100);
            safeSetText(percentageElement, `${percentage}%`);
            element.appendChild(percentageElement);
        }

        return element;
    }

    /**
     * 更新进度元素
     * @param {HTMLElement} element - 进度元素
     * @param {Object} progress - 进度对象
     */
    updateProgressElement(element, progress) {
        const progressBar = element.querySelector('.progress-bar');
        if (progressBar) {
            const percentage = (progress.value / progress.max) * 100;
            progressBar.style.width = `${percentage}%`;
            if (progress.color) {
                progressBar.style.backgroundColor = progress.color;
            }
        }

        const labelElement = element.querySelector('.progress-label');
        if (labelElement && progress.label) {
            safeSetText(labelElement, progress.label);
        }

        const percentageElement = element.querySelector('.progress-percentage');
        if (percentageElement && progress.showPercentage) {
            const percentage = Math.round((progress.value / progress.max) * 100);
            safeSetText(percentageElement, `${percentage}%`);
        }
    }

    /**
     * 显示元素
     * @param {HTMLElement} element - 要显示的元素
     */
    showElement(element) {
        if (!element) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';

        // 强制重绘
        element.offsetHeight;

        element.style.transition = `all ${this.options.animationDuration}ms ease-out`;
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';

        this.container.style.pointerEvents = '';
    }

    /**
     * 隐藏元素
     * @param {HTMLElement} element - 要隐藏的元素
     * @param {Function} callback - 回调函数
     */
    hideElement(element, callback) {
        if (!element) return;

        element.style.transition = `all ${this.options.animationDuration}ms ease-in`;
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            if (callback) callback();
        }, this.options.animationDuration);

        // 检查是否还有其他可见元素
        const hasVisibleElements =
            this.elements.notificationsContainer.children.length > 0 ||
            this.elements.statusContainer.children.length > 0 ||
            this.elements.progressContainer.children.length > 0;

        if (!hasVisibleElements) {
            this.container.style.pointerEvents = 'none';
        }
    }

    /**
     * 更新位置
     */
    updatePosition() {
        if (!this.container) return;

        const positions = {
            'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
            'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
            'bottom-right': { bottom: '20px', right: '20px', left: 'auto', top: 'auto' },
            'bottom-left': { bottom: '20px', left: '20px', right: 'auto', top: 'auto' },
            'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)', right: 'auto', top: 'auto' }
        };

        const position = positions[this.options.position] || positions['top-right'];
        Object.assign(this.container.style, position);
    }

    /**
     * 更新主题
     */
    updateTheme() {
        if (!this.container) return;

        this.container.className = this.container.className.replace(/theme-\w+/g, '');
        this.container.classList.add(`theme-${this.options.theme}`);

        if (this.options.theme === 'auto') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.container.classList.add('theme-dark');
            } else {
                this.container.classList.add('theme-light');
            }
        }
    }

    /**
     * 清除所有通知
     */
    clearNotifications() {
        [...this.notifications].forEach(notification => {
            this.hideNotification(notification.id);
        });
    }

    /**
     * 清除所有状态
     */
    clearStatuses() {
        [...this.activeStatuses.keys()].forEach(statusId => {
            this.hideStatus(statusId);
        });
    }

    /**
     * 清除所有进度条
     */
    clearProgress() {
        [...this.progressBars.keys()].forEach(progressId => {
            this.hideProgress(progressId);
        });
    }

    /**
     * 清除所有内容
     */
    clearAll() {
        this.clearNotifications();
        this.clearStatuses();
        this.clearProgress();
    }

    /**
     * 获取默认图标
     * @param {string} type - 类型
     * @returns {string} 图标
     */
    getDefaultIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
            loading: '⏳',
            connected: '●',
            disconnected: '○',
            syncing: '⟳'
        };
        return icons[type] || 'ℹ';
    }

    /**
     * 获取默认颜色
     * @param {string} type - 类型
     * @returns {string} 颜色
     */
    getDefaultColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            loading: '#6b7280'
        };
        return colors[type] || '#3b82f6';
    }

    /**
     * 生成唯一ID
     * @returns {string} ID
     */
    generateId() {
        return `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 设置选项
     * @param {Object} options - 新选项
     */
    setOptions(options) {
        Object.assign(this.options, options);
        this.updatePosition();
        this.updateTheme();
    }

    /**
     * 销毁状态指示器
     */
    destroy() {
        this.clearAll();

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.removeAllListeners();
        this.container = null;
        this.elements = {};
        this.notifications = [];
        this.activeStatuses.clear();
        this.progressBars.clear();

        console.log('状态指示器已销毁');
    }
}

// 创建默认实例
export const defaultStatusIndicator = new StatusIndicator();

// 导出到全局
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.StatusIndicator = StatusIndicator;
    window.defaultStatusIndicator = defaultStatusIndicator;
}

export default StatusIndicator;