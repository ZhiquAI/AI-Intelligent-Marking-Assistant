// ============================================================================
// 智学网AI阅卷助手 - Toast通知组件
// 100%还原原HTML中的通知逻辑
// ============================================================================

export class ToastNotification {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.isInitialized = false;
        this.config = {
            duration: 3000,
            maxToasts: 5,
            position: 'top-right',
            enableClose: true
        };
        
    }

    /**
     * 初始化Toast通知
     */
    initialize() {
        if (this.isInitialized) {
            
            return;
        }

        

        // 创建容器
        this.createContainer();

        this.isInitialized = true;
        
    }

    /**
     * 创建容器
     */
    createContainer() {
        // 检查是否已存在
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = this.getContainerClass();
            document.body.appendChild(this.container);
        }
    }

    /**
     * 获取容器类名
     * @returns {string} CSS类名
     */
    getContainerClass() {
        const positionClasses = {
            'top-right': 'fixed top-4 right-4 z-[9999]',
            'top-left': 'fixed top-4 left-4 z-[9999]',
            'bottom-right': 'fixed bottom-4 right-4 z-[9999]',
            'bottom-left': 'fixed bottom-4 left-4 z-[9999]',
            'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]',
            'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9999]'
        };

        return positionClasses[this.config.position] || positionClasses['top-right'];
    }

    /**
     * 显示Toast
     * @param {string} type - 类型 (success, error, warning, info)
     * @param {string} title - 标题
     * @param {string} message - 消息
     * @param {Object} options - 选项
     * @returns {string} Toast ID
     */
    show(type, title, message, options = {}) {
        if (!this.isInitialized) {
            this.initialize();
        }

        const id = this.generateId();
        const toast = {
            id,
            type,
            title,
            message,
            timestamp: Date.now(),
            duration: options.duration || this.config.duration,
            ...options
        };

        

        // 创建Toast元素
        const element = this.createToastElement(toast);

        // 添加到容器
        this.container.appendChild(element);

        // 添加到管理列表
        this.toasts.set(id, { ...toast, element });

        // 检查是否超过最大数量
        this.enforceMaxToasts();

        // 显示动画
        this.showToast(element);

        // 自动关闭
        if (toast.duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, toast.duration);
        }

        return id;
    }

    /**
     * 创建Toast元素
     * @param {Object} toast - Toast对象
     * @returns {HTMLElement} Toast元素
     */
    createToastElement(toast) {
        const element = document.createElement('div');
        element.className = this.getToastClass(toast.type);
        element.dataset.toastId = toast.id;

        const icon = this.getIcon(toast.type);
        const progressBar = toast.duration > 0 ? this.createProgressBar(toast.duration) : '';

        element.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <i data-lucide="${icon}" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium">${toast.title}</div>
                    ${toast.message ? `<div class="text-xs text-gray-500 mt-0.5">${toast.message}</div>` : ''}
                </div>
                ${this.config.enableClose ? `
                    <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" data-toast-close>
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                ` : ''}
            </div>
            ${progressBar}
        `;

        // 绑定关闭事件
        const closeBtn = element.querySelector('[data-toast-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide(toast.id);
            });
        }

        return element;
    }

    /**
     * 创建进度条
     * @param {number} duration - 持续时间
     * @returns {string} HTML
     */
    createProgressBar(duration) {
        return `
            <div class="w-full h-1 bg-gray-200 mt-2 rounded-full overflow-hidden">
                <div class="h-full bg-current opacity-30 rounded-full animate-progress" style="animation-duration: ${duration}ms"></div>
            </div>
        `;
    }

    /**
     * 获取Toast类名
     * @param {string} type - 类型
     * @returns {string} CSS类名
     */
    getToastClass(type) {
        const baseClass = 'bg-white border border-gray-200 rounded-lg shadow-lg p-4 mb-3 max-w-sm transform transition-all duration-300 ease-in-out';
        const typeClasses = {
            success: 'text-green-800 border-l-4 border-l-green-500',
            error: 'text-red-800 border-l-4 border-l-red-500',
            warning: 'text-yellow-800 border-l-4 border-l-yellow-500',
            info: 'text-blue-800 border-l-4 border-l-blue-500'
        };

        return `${baseClass} ${typeClasses[type] || typeClasses.info}`;
    }

    /**
     * 获取图标
     * @param {string} type - 类型
     * @returns {string} 图标名
     */
    getIcon(type) {
        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-circle',
            info: 'info'
        };
        return iconMap[type] || 'info';
    }

    /**
     * 显示Toast动画
     * @param {HTMLElement} element - Toast元素
     */
    showToast(element) {
        // 初始状态
        element.style.transform = 'translateX(400px)';
        element.style.opacity = '0';

        // 动画效果
        setTimeout(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        }, 10);
    }

    /**
     * 隐藏Toast
     * @param {string} id - Toast ID
     */
    hide(id) {
        const toast = this.toasts.get(id);
        if (!toast) {
            // console.warn('⚠️ Toast不存在:', id);
            return;
        }

        

        const element = toast.element;
        element.style.transform = 'translateX(400px)';
        element.style.opacity = '0';

        // 延迟移除
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.delete(id);
        }, 300);
    }

    /**
     * 强制执行最大Toast数量
     */
    enforceMaxToasts() {
        if (this.toasts.size > this.config.maxToasts) {
            const firstToast = this.toasts.values().next().value;
            if (firstToast) {
                this.hide(firstToast.id);
            }
        }
    }

    /**
     * 隐藏所有Toast
     */
    hideAll() {
        
        this.toasts.forEach((toast, id) => {
            this.hide(id);
        });
    }

    /**
     * 清除所有Toast
     */
    clear() {
        
        this.hideAll();
        this.toasts.clear();
    }

    /**
     * 生成ID
     * @returns {string} ID
     */
    generateId() {
        return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 配置
     * @param {Object} newConfig - 新配置
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // 更新容器类名
        if (this.container) {
            this.container.className = this.getContainerClass();
        }

        
    }

    /**
     * 获取状态
     * @returns {Object} 状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            activeToasts: this.toasts.size,
            toastIds: Array.from(this.toasts.keys())
        };
    }

    /**
     * 成功提示
     * @param {string} title - 标题
     * @param {string} message - 消息
     * @param {Object} options - 选项
     * @returns {string} Toast ID
     */
    success(title, message, options = {}) {
        return this.show('success', title, message, options);
    }

    /**
     * 错误提示
     * @param {string} title - 标题
     * @param {string} message - 消息
     * @param {Object} options - 选项
     * @returns {string} Toast ID
     */
    error(title, message, options = {}) {
        return this.show('error', title, message, { ...options, duration: 5000 });
    }

    /**
     * 警告提示
     * @param {string} title - 标题
     * @param {string} message - 消息
     * @param {Object} options - 选项
     * @returns {string} Toast ID
     */
    warning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    }

    /**
     * 信息提示
     * @param {string} title - 标题
     * @param {string} message - 消息
     * @param {Object} options - 选项
     * @returns {string} Toast ID
     */
    info(title, message, options = {}) {
        return this.show('info', title, message, options);
    }
}

// 创建全局实例
export const toast = new ToastNotification();