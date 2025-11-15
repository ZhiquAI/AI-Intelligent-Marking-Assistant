// ============================================================================
// 智学网AI阅卷助手 - Tooltip提示框组件
// 100%还原原HTML中的提示框逻辑
// ============================================================================

export class Tooltip {
    constructor() {
        this.tooltips = new Map();
        this.activeTooltip = null;
        this.isInitialized = false;
        this.config = {
            defaultPlacement: 'top',
            delay: 500,
            duration: 3000,
            theme: 'dark',
            maxWidth: '250px'
        };
        
    }

    /**
     * 初始化Tooltip
     */
    initialize() {
        if (this.isInitialized) {
            
            return;
        }

        

        // 绑定全局事件
        this.bindGlobalEvents();

        this.isInitialized = true;
        
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 鼠标事件
        document.addEventListener('mouseenter', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.show(target, target.dataset.tooltip, {
                    placement: target.dataset.tooltipPlacement || this.config.defaultPlacement
                });
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.hide(target);
            }
        }, true);

        // 触摸事件
        document.addEventListener('touchstart', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.show(target, target.dataset.tooltip, {
                    placement: target.dataset.tooltipPlacement || this.config.defaultPlacement,
                    trigger: 'touch'
                });
            }
        }, true);

        // 点击外部隐藏
        document.addEventListener('click', (e) => {
            if (this.activeTooltip && !this.activeTooltip.element.contains(e.target)) {
                this.hide(this.activeTooltip.target);
            }
        });
    }

    /**
     * 显示Tooltip
     * @param {HTMLElement} target - 目标元素
     * @param {string} content - 内容
     * @param {Object} options - 选项
     * @returns {string} Tooltip ID
     */
    show(target, content, options = {}) {
        if (!target) return null;

        

        const id = this.generateId();
        const tooltip = {
            id,
            target,
            content,
            placement: options.placement || this.config.defaultPlacement,
            theme: options.theme || this.config.theme,
            maxWidth: options.maxWidth || this.config.maxWidth,
            trigger: options.trigger || 'hover',
            element: null,
            timeout: null
        };

        // 创建Tooltip元素
        const element = this.createTooltipElement(tooltip);
        document.body.appendChild(element);

        // 定位
        this.positionTooltip(tooltip);

        tooltip.element = element;
        this.tooltips.set(id, tooltip);
        this.activeTooltip = tooltip;

        // 显示动画
        this.showTooltip(element);

        // 自动隐藏
        if (options.duration > 0 || this.config.duration > 0) {
            const duration = options.duration || this.config.duration;
            tooltip.timeout = setTimeout(() => {
                this.hide(target);
            }, duration);
        }

        return id;
    }

    /**
     * 创建Tooltip元素
     * @param {Object} tooltip - Tooltip对象
     * @returns {HTMLElement} Tooltip元素
     */
    createTooltipElement(tooltip) {
        const element = document.createElement('div');
        element.className = this.getTooltipClass(tooltip.theme);
        element.style.maxWidth = tooltip.maxWidth;
        element.dataset.tooltipId = tooltip.id;

        // 箭头
        const arrow = document.createElement('div');
        arrow.className = this.getArrowClass(tooltip.placement);
        element.appendChild(arrow);

        // 内容
        const content = document.createElement('div');
        content.className = 'tooltip-content';
        content.innerHTML = tooltip.content;
        element.appendChild(content);

        return element;
    }

    /**
     * 获取Tooltip类名
     * @param {string} theme - 主题
     * @returns {string} CSS类名
     */
    getTooltipClass(theme) {
        const baseClass = 'absolute z-[9999] px-3 py-2 text-sm rounded-lg shadow-lg pointer-events-none transition-opacity duration-200';
        const themeClasses = {
            dark: 'bg-gray-900 text-white',
            light: 'bg-white text-gray-900 border border-gray-200',
            blue: 'bg-blue-600 text-white',
            green: 'bg-green-600 text-white',
            red: 'bg-red-600 text-white'
        };

        return `${baseClass} ${themeClasses[theme] || themeClasses.dark}`;
    }

    /**
     * 获取箭头类名
     * @param {string} placement - 位置
     * @returns {string} CSS类名
     */
    getArrowClass(placement) {
        const baseClass = 'absolute w-2 h-2 transform rotate-45';
        const placementClasses = {
            top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
            bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
            left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
            right: 'right-full top-1/2 -translate-y-1/2 -mr-1'
        };

        return `${baseClass} ${placementClasses[placement] || placementClasses.top}`;
    }

    /**
     * 定位Tooltip
     * @param {Object} tooltip - Tooltip对象
     */
    positionTooltip(tooltip) {
        const target = tooltip.target;
        const element = tooltip.element;
        const placement = tooltip.placement;

        if (!target || !element) return;

        const targetRect = target.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // 计算位置
        switch (placement) {
            case 'top':
                top = targetRect.top - elementRect.height - 8 + window.scrollY;
                left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2) + window.scrollX;
                break;
            case 'bottom':
                top = targetRect.bottom + 8 + window.scrollY;
                left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2) + window.scrollX;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (elementRect.height / 2) + window.scrollY;
                left = targetRect.left - elementRect.width - 8 + window.scrollX;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (elementRect.height / 2) + window.scrollY;
                left = targetRect.right + 8 + window.scrollX;
                break;
        }

        // 边界检查和调整
        const padding = 10;
        const maxLeft = window.scrollX + window.innerWidth - elementRect.width - padding;
        const maxTop = window.scrollY + window.innerHeight - elementRect.height - padding;

        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));

        // 应用位置
        element.style.top = `${top}px`;
        element.style.left = `${left}px`;
    }

    /**
     * 显示Tooltip动画
     * @param {HTMLElement} element - Tooltip元素
     */
    showTooltip(element) {
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.opacity = '1';
        }, 10);
    }

    /**
     * 隐藏Tooltip
     * @param {HTMLElement} target - 目标元素
     */
    hide(target) {
        const tooltip = this.findTooltipByTarget(target);
        if (!tooltip) return;

        

        // 清除定时器
        if (tooltip.timeout) {
            clearTimeout(tooltip.timeout);
        }

        // 隐藏动画
        if (tooltip.element) {
            tooltip.element.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.element && tooltip.element.parentNode) {
                    tooltip.element.parentNode.removeChild(tooltip.element);
                }
            }, 200);
        }

        // 从管理列表中移除
        this.tooltips.delete(tooltip.id);
        if (this.activeTooltip && this.activeTooltip.id === tooltip.id) {
            this.activeTooltip = null;
        }
    }

    /**
     * 根据目标元素查找Tooltip
     * @param {HTMLElement} target - 目标元素
     * @returns {Object|null} Tooltip对象
     */
    findTooltipByTarget(target) {
        for (const tooltip of this.tooltips.values()) {
            if (tooltip.target === target) {
                return tooltip;
            }
        }
        return null;
    }

    /**
     * 隐藏所有Tooltip
     */
    hideAll() {
        
        this.tooltips.forEach((tooltip) => {
            this.hide(tooltip.target);
        });
    }

    /**
     * 手动创建Tooltip
     * @param {HTMLElement} target - 目标元素
     * @param {string} content - 内容
     * @param {Object} options - 选项
     */
    create(target, content, options = {}) {
        if (!target) return;

        // 设置属性
        target.dataset.tooltip = content;
        if (options.placement) {
            target.dataset.tooltipPlacement = options.placement;
        }
    }

    /**
     * 移除Tooltip
     * @param {HTMLElement} target - 目标元素
     */
    remove(target) {
        const tooltip = this.findTooltipByTarget(target);
        if (tooltip) {
            this.hide(target);
        }

        // 移除属性
        delete target.dataset.tooltip;
        delete target.dataset.tooltipPlacement;
    }

    /**
     * 生成ID
     * @returns {string} ID
     */
    generateId() {
        return `tooltip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 配置
     * @param {Object} newConfig - 新配置
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
    }

    /**
     * 获取状态
     * @returns {Object} 状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            activeTooltips: this.tooltips.size,
            activeTooltip: this.activeTooltip
        };
    }
}

// 创建全局实例
export const tooltip = new Tooltip();