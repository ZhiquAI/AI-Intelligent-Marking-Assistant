/**
 * Toast通知系统
 * @description 提供轻量级、非侵入式的用户通知反馈
 */

/**
 * Toast通知管理器
 */
class ToastNotifier {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.config = {
            position: 'top-right',
            duration: 3000,
            maxToasts: 5,
            animationDuration: 300
        };
        this.isInitialized = false;
    }

    /**
     * 初始化Toast系统
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        this.createContainer();
        this.injectStyles();
        this.isInitialized = true;
        
    }

    /**
     * 创建Toast容器
     */
    createContainer() {
        if (this.container) {
            return;
        }

        this.container = document.createElement('div');
        this.container.className = `toast-container toast-${this.config.position}`;
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');

        document.body.appendChild(this.container);
    }

    /**
     * 注入样式
     */
    injectStyles() {
        if (document.getElementById('toast-styles')) {
            return;
        }

        const styles = `
            .toast-container {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
                width: 100%;
            }

            .toast-top-right {
                top: 20px;
                right: 20px;
            }

            .toast-top-left {
                top: 20px;
                left: 20px;
            }

            .toast-bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .toast-bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .toast-top-center {
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .toast-bottom-center {
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
            }

            .toast {
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                pointer-events: all;
                position: relative;
                overflow: hidden;
                animation: slideIn 0.3s ease-out;
                border-left: 4px solid;
                min-height: 48px;
            }

            .toast-success {
                border-left-color: #10b981;
                background: #f0fdf4;
            }

            .toast-error {
                border-left-color: #ef4444;
                background: #fef2f2;
            }

            .toast-warning {
                border-left-color: #f59e0b;
                background: #fffbeb;
            }

            .toast-info {
                border-left-color: #3b82f6;
                background: #eff6ff;
            }

            .toast-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }

            .toast-content {
                flex: 1;
                min-width: 0;
            }

            .toast-title {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 4px;
                color: #1f2937;
            }

            .toast-message {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.4;
            }

            .toast-close {
                flex-shrink: 0;
                background: none;
                border: none;
                font-size: 18px;
                color: #9ca3af;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .toast-close:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 0 0 8px 8px;
                overflow: hidden;
            }

            .toast-progress-bar {
                height: 100%;
                background: currentColor;
                border-radius: inherit;
                transition: width linear;
            }

            .toast-success .toast-progress-bar {
                background: #10b981;
            }

            .toast-error .toast-progress-bar {
                background: #ef4444;
            }

            .toast-warning .toast-progress-bar {
                background: #f59e0b;
            }

            .toast-info .toast-progress-bar {
                background: #3b82f6;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            .toast-removing {
                animation: slideOut 0.3s ease-in forwards;
            }

            /* 无障碍支持 */
            .toast:focus-within {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
            }

            /* 暗色模式支持 */
            @media (prefers-color-scheme: dark) {
                .toast {
                    background: #1f2937;
                    color: #f9fafb;
                }

                .toast-title {
                    color: #f9fafb;
                }

                .toast-message {
                    color: #d1d5db;
                }

                .toast-close {
                    color: #9ca3af;
                }

                .toast-close:hover {
                    background: #374151;
                    color: #f3f4f6;
                }

                .toast-success {
                    background: #064e3b;
                }

                .toast-error {
                    background: #7f1d1d;
                }

                .toast-warning {
                    background: #78350f;
                }

                .toast-info {
                    background: #1e3a8a;
                }
            }

            /* 响应式设计 */
            @media (max-width: 640px) {
                .toast-container {
                    max-width: calc(100vw - 32px);
                    left: 16px;
                    right: 16px;
                }

                .toast {
                    padding: 12px 16px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'toast-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * 显示Toast通知
     */
    show(message, options = {}) {
        if (!this.isInitialized) {
            // console.warn('Toast系统未初始化，正在自动初始化...');
            this.initialize();
        }

        const config = { ...this.config, ...options };
        const toast = this.createToast(message, config);

        this.addToast(toast);
        this.startTimer(toast, config.duration);

        return toast.id;
    }

    /**
     * 创建Toast元素
     */
    createToast(message, config) {
        const toast = document.createElement('div');
        const id = this.generateId();

        toast.className = `toast toast-${config.type || 'info'}`;
        toast.id = `toast-${id}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        const icon = this.getIcon(config.type || 'info');
        const title = config.title || this.getDefaultTitle(config.type || 'info');

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="关闭通知">×</button>
            ${config.showProgress ? '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' : ''}
        `;

        const toastObj = {
            id,
            element: toast,
            config,
            timer: null
        };

        this.bindEvents(toastObj);

        return toastObj;
    }

    /**
     * 绑定事件
     */
    bindEvents(toast) {
        const closeBtn = toast.element.querySelector('.toast-close');

        closeBtn.addEventListener('click', () => {
            this.removeToast(toast.id);
        });

        toast.element.addEventListener('mouseenter', () => {
            this.pauseTimer(toast.id);
        });

        toast.element.addEventListener('mouseleave', () => {
            this.resumeTimer(toast.id);
        });

        // 支持键盘导航
        toast.element.addEventListener('keydown', e => {
            if (e.key === 'Escape' || e.key === 'Delete') {
                this.removeToast(toast.id);
            }
        });
    }

    /**
     * 添加Toast到容器
     */
    addToast(toast) {
        // 检查最大数量限制
        if (this.toasts.size >= this.config.maxToasts) {
            const firstToast = this.toasts.values().next().value;
            this.removeToast(firstToast.id);
        }

        this.toasts.set(toast.id, toast);

        // 根据位置决定插入方式
        if (this.config.position.includes('top')) {
            this.container.insertBefore(toast.element, this.container.firstChild);
        } else {
            this.container.appendChild(toast.element);
        }

        // 触发入场动画
        requestAnimationFrame(() => {
            toast.element.classList.add('toast-show');
        });
    }

    /**
     * 移除Toast
     */
    removeToast(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        this.clearTimer(id);
        toast.element.classList.add('toast-removing');

        toast.element.addEventListener(
            'animationend',
            () => {
                toast.element.remove();
                this.toasts.delete(id);
            },
            { once: true }
        );
    }

    /**
     * 启动计时器
     */
    startTimer(toast, duration) {
        if (duration === 0) return; // 0表示不自动关闭

        const progressBar = toast.element.querySelector('.toast-progress-bar');
        let remaining = duration;
        let startTime = Date.now();

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            remaining = duration - elapsed;

            if (progressBar) {
                const progress = Math.max(0, (remaining / duration) * 100);
                progressBar.style.width = `${progress}%`;
            }

            if (remaining <= 0) {
                this.removeToast(toast.id);
            }
        }, 50);

        toast.timer = { timer, startTime, duration, remaining };
    }

    /**
     * 暂停计时器
     */
    pauseTimer(id) {
        const toast = this.toasts.get(id);
        if (!toast || !toast.timer) return;

        clearInterval(toast.timer.timer);
        const elapsed = Date.now() - toast.timer.startTime;
        toast.timer.remaining = toast.timer.duration - elapsed;
    }

    /**
     * 恢复计时器
     */
    resumeTimer(id) {
        const toast = this.toasts.get(id);
        if (!toast || !toast.timer) return;

        this.startTimer(toast, toast.timer.remaining);
    }

    /**
     * 清除计时器
     */
    clearTimer(id) {
        const toast = this.toasts.get(id);
        if (toast && toast.timer) {
            clearInterval(toast.timer.timer);
            toast.timer = null;
        }
    }

    /**
     * 获取图标
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    /**
     * 获取默认标题
     */
    getDefaultTitle(type) {
        const titles = {
            success: '成功',
            error: '错误',
            warning: '警告',
            info: '提示'
        };
        return titles[type] || titles.info;
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 快捷方法
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    error(message, options = {}) {
        return this.show(message, {
            ...options,
            type: 'error',
            duration: options.duration || 5000
        });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }

    /**
     * 清除所有Toast
     */
    clearAll() {
        const ids = Array.from(this.toasts.keys());
        ids.forEach(id => this.removeToast(id));
    }

    /**
     * 销毁Toast系统
     */
    destroy() {
        this.clearAll();
        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        const styles = document.getElementById('toast-styles');
        if (styles) {
            styles.remove();
        }

        this.isInitialized = false;
    }
}

// 创建全局实例
const toastNotifier = new ToastNotifier();

// 导出模块接口
export { ToastNotifier, toastNotifier };
