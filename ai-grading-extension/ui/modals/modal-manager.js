// ============================================================================
// 智学网AI阅卷助手 - 模态框管理器
// 100%还原原HTML中的模态框管理逻辑
// ============================================================================

export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.modalStack = [];
        this.isInitialized = false;
        
    }

    /**
     * 初始化模态框管理器
     */
    initialize() {
        if (this.isInitialized) {
            
            return;
        }

        

        // 注册默认模态框
        this.registerDefaultModals();

        // 绑定全局事件
        this.bindGlobalEvents();

        this.isInitialized = true;
        
    }

    /**
     * 注册默认模态框
     */
    registerDefaultModals() {
        

        const defaultModals = [
            'scoreAdjustmentModal',
            'exportModal',
            'settingsModal',
            'confirmModal',
            'previewModal'
        ];

        defaultModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.register(modalId, modal);
            }
        });

        
    }

    /**
     * 注册模态框
     * @param {string} id - 模态框ID
     * @param {HTMLElement} element - 模态框元素
     */
    register(id, element) {
        this.modals.set(id, {
            id,
            element,
            isOpen: false,
            callbacks: {}
        });

        // 绑定模态框事件
        this.bindModalEvents(element, id);

        
    }

    /**
     * 绑定模态框事件
     * @param {HTMLElement} modal - 模态框元素
     * @param {string} modalId - 模态框ID
     */
    bindModalEvents(modal, modalId) {
        // 关闭按钮
        const closeBtn = modal.querySelector('[data-modal-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(modalId);
            });
        }

        // 背景点击关闭
        const backdrop = modal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.close(modalId);
                }
            });
        }

        // ESC键关闭
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && this.activeModal === modalId) {
                this.close(modalId);
                document.removeEventListener('keydown', handleEscKey);
            }
        };

        // 当模态框打开时添加ESC监听
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isVisible = !modal.classList.contains('hidden');
                    if (isVisible && !this.modals.get(modalId).isOpen) {
                        this.modals.get(modalId).isOpen = true;
                        this.modalStack.push(modalId);
                        this.activeModal = modalId;
                        document.addEventListener('keydown', handleEscKey);
                    } else if (!isVisible && this.modals.get(modalId).isOpen) {
                        this.modals.get(modalId).isOpen = false;
                        this.modalStack = this.modalStack.filter(id => id !== modalId);
                        if (this.modalStack.length > 0) {
                            this.activeModal = this.modalStack[this.modalStack.length - 1];
                        } else {
                            this.activeModal = null;
                        }
                        document.removeEventListener('keydown', handleEscKey);
                    }
                }
            });
        });

        observer.observe(modal, { attributes: true });
    }

    /**
     * 绑定全局事件
     */
    bindGlobalEvents() {
        // 阻止模态框背景滚动
        document.addEventListener('wheel', (e) => {
            if (this.activeModal) {
                e.preventDefault();
            }
        }, { passive: false });

        // 阻止模态框背景点击
        document.addEventListener('click', (e) => {
            if (this.activeModal) {
                const modal = this.modals.get(this.activeModal);
                if (modal && !modal.element.contains(e.target)) {
                    e.stopPropagation();
                }
            }
        });
    }

    /**
     * 打开模态框
     * @param {string} modalId - 模态框ID
     * @param {Object} options - 选项
     */
    open(modalId, options = {}) {
        const modal = this.modals.get(modalId);
        if (!modal) {
            // // console.error('❌ 模态框不存在:', modalId);
            return;
        }

        

        const element = modal.element;

        // 设置数据
        if (options.data) {
            element.dataset.modalData = JSON.stringify(options.data);
        }

        // 执行打开回调
        if (modal.callbacks.onOpen) {
            modal.callbacks.onOpen(options);
        }

        // 显示模态框
        element.classList.remove('hidden');

        // 动画效果
        setTimeout(() => {
            const backdrop = element.querySelector('.modal-backdrop');
            const content = element.querySelector('.modal-content');

            if (backdrop) {
                backdrop.classList.add('opacity-100');
            }
            if (content) {
                content.classList.add('scale-100', 'opacity-100');
                content.classList.remove('scale-95', 'opacity-0');
            }
        }, 10);

        // 设置焦点
        this.setInitialFocus(element);

        // 触发打开事件
        this.triggerEvent(element, 'modal:open', { modalId, options });
    }

    /**
     * 关闭模态框
     * @param {string} modalId - 模态框ID
     */
    close(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) {
            // // console.error('❌ 模态框不存在:', modalId);
            return;
        }

        

        const element = modal.element;

        // 执行关闭回调
        if (modal.callbacks.onClose) {
            modal.callbacks.onClose();
        }

        // 隐藏模态框
        const backdrop = element.querySelector('.modal-backdrop');
        const content = element.querySelector('.modal-content');

        if (backdrop) {
            backdrop.classList.remove('opacity-100');
        }
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }

        // 延迟隐藏以支持动画
        setTimeout(() => {
            element.classList.add('hidden');

            // 清理数据
            delete element.dataset.modalData;

            // 触发关闭事件
            this.triggerEvent(element, 'modal:close', { modalId });
        }, 300);
    }

    /**
     * 切换模态框
     * @param {string} modalId - 模态框ID
     * @param {Object} options - 选项
     */
    toggle(modalId, options = {}) {
        const modal = this.modals.get(modalId);
        if (modal && modal.isOpen) {
            this.close(modalId);
        } else {
            this.open(modalId, options);
        }
    }

    /**
     * 关闭所有模态框
     */
    closeAll() {
        
        this.modals.forEach((modal, modalId) => {
            if (modal.isOpen) {
                this.close(modalId);
            }
        });
    }

    /**
     * 设置初始焦点
     * @param {HTMLElement} modal - 模态框元素
     */
    setInitialFocus(modal) {
        // 查找焦点元素
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            setTimeout(() => {
                firstElement.focus();
            }, 100);
        }
    }

    /**
     * 触发事件
     * @param {HTMLElement} element - 元素
     * @param {string} eventName - 事件名
     * @param {Object} detail - 详情
     */
    triggerEvent(element, eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        element.dispatchEvent(event);
    }

    /**
     * 注册模态框回调
     * @param {string} modalId - 模态框ID
     * @param {string} event - 事件名
     * @param {Function} callback - 回调函数
     */
    on(modalId, event, callback) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.callbacks[event] = callback;
        }
    }

    /**
     * 取消注册模态框回调
     * @param {string} modalId - 模态框ID
     * @param {string} event - 事件名
     */
    off(modalId, event) {
        const modal = this.modals.get(modalId);
        if (modal) {
            delete modal.callbacks[event];
        }
    }

    /**
     * 获取模态框状态
     * @param {string} modalId - 模态框ID
     * @returns {Object} 状态
     */
    getModalState(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            return {
                id: modalId,
                isOpen: modal.isOpen,
                hasElement: !!modal.element
            };
        }
        return null;
    }

    /**
     * 获取所有模态框状态
     * @returns {Array} 状态列表
     */
    getAllModalStates() {
        const states = [];
        this.modals.forEach((modal, modalId) => {
            states.push(this.getModalState(modalId));
        });
        return states;
    }

    /**
     * 获取当前活跃模态框
     * @returns {string|null} 模态框ID
     */
    getActiveModal() {
        return this.activeModal;
    }

    /**
     * 获取状态
     * @returns {Object} 状态对象
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            activeModal: this.activeModal,
            modalStack: [...this.modalStack],
            registeredModals: Array.from(this.modals.keys()),
            totalModals: this.modals.size
        };
    }
}

// 创建全局实例
export const modalManager = new ModalManager();