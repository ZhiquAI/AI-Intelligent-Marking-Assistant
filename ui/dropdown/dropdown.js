// ============================================================================
// 智学网AI阅卷助手 - Dropdown下拉菜单组件
// 100%还原原HTML中的下拉菜单逻辑
// ============================================================================

export class Dropdown {
    constructor() {
        this.dropdowns = new Map();
        this.activeDropdown = null;
        this.isInitialized = false;
        this.config = {
            defaultPlacement: 'bottom-start',
            trigger: 'click',
            closeOnClick: true,
            closeOnOutsideClick: true
        };
        
    }

    /**
     * 初始化Dropdown
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
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.activeDropdown) return;

            const isClickInside = this.activeDropdown.trigger.contains(e.target) ||
                                  this.activeDropdown.menu.contains(e.target);

            if (!isClickInside && this.config.closeOnOutsideClick) {
                this.close(this.activeDropdown.id);
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeDropdown) {
                this.close(this.activeDropdown.id);
                this.activeDropdown.trigger.focus();
            }
        });
    }

    /**
     * 注册Dropdown
     * @param {string} id - Dropdown ID
     * @param {HTMLElement} trigger - 触发器元素
     * @param {HTMLElement} menu - 菜单元素
     * @param {Object} options - 选项
     */
    register(id, trigger, menu, options = {}) {
        const dropdown = {
            id,
            trigger,
            menu,
            isOpen: false,
            options: {
                ...this.config,
                ...options
            },
            items: []
        };

        

        // 绑定触发器事件
        this.bindTriggerEvents(dropdown);

        // 解析菜单项
        this.parseMenuItems(dropdown);

        // 注册
        this.dropdowns.set(id, dropdown);
    }

    /**
     * 绑定触发器事件
     * @param {Object} dropdown - Dropdown对象
     */
    bindTriggerEvents(dropdown) {
        const { trigger, options } = dropdown;

        if (options.trigger === 'click') {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle(dropdown.id);
            });
        } else if (options.trigger === 'hover') {
            trigger.addEventListener('mouseenter', () => {
                this.open(dropdown.id);
            });

            trigger.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!this.isHoveringMenu(dropdown)) {
                        this.close(dropdown.id);
                    }
                }, 100);
            });
        }

        // 键盘导航
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open(dropdown.id);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.open(dropdown.id);
                this.focusFirstItem(dropdown);
            }
        });
    }

    /**
     * 解析菜单项
     * @param {Object} dropdown - Dropdown对象
     */
    parseMenuItems(dropdown) {
        const { menu } = dropdown;
        const items = menu.querySelectorAll('[data-dropdown-item]');

        items.forEach((item, index) => {
            // 绑定点击事件
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                const value = item.dataset.value;

                if (dropdown.options.closeOnClick) {
                    this.close(dropdown.id);
                }

                // 触发选中事件
                this.triggerSelectEvent(dropdown, {
                    item,
                    action,
                    value,
                    index
                });
            });

            // 绑定键盘导航
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.focusNextItem(dropdown, index);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.focusPrevItem(dropdown, index);
                }
            });

            dropdown.items.push(item);
        });
    }

    /**
     * 打开Dropdown
     * @param {string} id - Dropdown ID
     */
    open(id) {
        const dropdown = this.dropdowns.get(id);
        if (!dropdown) {
            // console.error('❌ Dropdown不存在:', id);
            return;
        }

        

        dropdown.isOpen = true;
        this.activeDropdown = dropdown;

        // 显示菜单
        dropdown.menu.classList.remove('hidden');
        dropdown.menu.setAttribute('aria-expanded', 'true');

        // 定位菜单
        this.positionMenu(dropdown);

        // 触发打开事件
        this.triggerEvent(dropdown.menu, 'dropdown:open', { id });

        // 初始焦点
        if (dropdown.items.length > 0) {
            setTimeout(() => {
                this.focusFirstItem(dropdown);
            }, 100);
        }
    }

    /**
     * 关闭Dropdown
     * @param {string} id - Dropdown ID
     */
    close(id) {
        const dropdown = this.dropdowns.get(id);
        if (!dropdown) return;

        

        dropdown.isOpen = false;

        // 隐藏菜单
        dropdown.menu.classList.add('hidden');
        dropdown.menu.setAttribute('aria-expanded', 'false');

        if (this.activeDropdown && this.activeDropdown.id === id) {
            this.activeDropdown = null;
        }

        // 触发关闭事件
        this.triggerEvent(dropdown.menu, 'dropdown:close', { id });
    }

    /**
     * 切换Dropdown
     * @param {string} id - Dropdown ID
     */
    toggle(id) {
        const dropdown = this.dropdowns.get(id);
        if (!dropdown) return;

        if (dropdown.isOpen) {
            this.close(id);
        } else {
            this.open(id);
        }
    }

    /**
     * 定位菜单
     * @param {Object} dropdown - Dropdown对象
     */
    positionMenu(dropdown) {
        const { trigger, menu, options } = dropdown;
        const placement = options.placement;

        const triggerRect = trigger.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // 计算位置
        switch (placement) {
            case 'bottom-start':
                top = triggerRect.bottom + window.scrollY;
                left = triggerRect.left + window.scrollX;
                break;
            case 'bottom-end':
                top = triggerRect.bottom + window.scrollY;
                left = triggerRect.right - menuRect.width + window.scrollX;
                break;
            case 'top-start':
                top = triggerRect.top - menuRect.height + window.scrollY;
                left = triggerRect.left + window.scrollX;
                break;
            case 'top-end':
                top = triggerRect.top - menuRect.height + window.scrollY;
                left = triggerRect.right - menuRect.width + window.scrollX;
                break;
            default:
                top = triggerRect.bottom + window.scrollY;
                left = triggerRect.left + window.scrollX;
        }

        // 边界检查
        const padding = 10;
        const maxLeft = window.scrollX + window.innerWidth - menuRect.width - padding;
        const maxTop = window.scrollY + window.innerHeight - menuRect.height - padding;

        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));

        // 应用位置
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
    }

    /**
     * 检查是否在菜单上
     * @param {Object} dropdown - Dropdown对象
     * @returns {boolean} 是否在菜单上
     */
    isHoveringMenu(dropdown) {
        const { menu } = dropdown;
        const rect = menu.getBoundingClientRect();
        const x = window.event ? window.event.clientX : 0;
        const y = window.event ? window.event.clientY : 0;

        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    /**
     * 聚焦第一个菜单项
     * @param {Object} dropdown - Dropdown对象
     */
    focusFirstItem(dropdown) {
        if (dropdown.items.length > 0) {
            dropdown.items[0].focus();
        }
    }

    /**
     * 聚焦下一个菜单项
     * @param {Object} dropdown - Dropdown对象
     * @param {number} currentIndex - 当前索引
     */
    focusNextItem(dropdown, currentIndex) {
        const nextIndex = (currentIndex + 1) % dropdown.items.length;
        dropdown.items[nextIndex].focus();
    }

    /**
     * 聚焦上一个菜单项
     * @param {Object} dropdown - Dropdown对象
     * @param {number} currentIndex - 当前索引
     */
    focusPrevItem(dropdown, currentIndex) {
        const prevIndex = currentIndex === 0 ? dropdown.items.length - 1 : currentIndex - 1;
        dropdown.items[prevIndex].focus();
    }

    /**
     * 触发选中事件
     * @param {Object} dropdown - Dropdown对象
     * @param {Object} data - 数据
     */
    triggerSelectEvent(dropdown, data) {
        this.triggerEvent(dropdown.menu, 'dropdown:select', {
            id: dropdown.id,
            ...data
        });
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
     * 更新菜单项
     * @param {string} id - Dropdown ID
     * @param {Array} items - 新菜单项
     */
    updateItems(id, items) {
        const dropdown = this.dropdowns.get(id);
        if (!dropdown) return;

        // 清空现有菜单
        dropdown.menu.innerHTML = '';

        // 添加新菜单项
        items.forEach(item => {
            const element = document.createElement('div');
            element.dataset.dropdownItem = 'true';
            element.textContent = item.label;
            if (item.value !== undefined) {
                element.dataset.value = item.value;
            }
            if (item.action) {
                element.dataset.action = item.action;
            }
            dropdown.menu.appendChild(element);
        });

        // 重新解析菜单项
        dropdown.items = [];
        this.parseMenuItems(dropdown);

        
    }

    /**
     * 设置触发器文本
     * @param {string} id - Dropdown ID
     * @param {string} text - 文本
     */
    setTriggerText(id, text) {
        const dropdown = this.dropdowns.get(id);
        if (dropdown) {
            const trigger = dropdown.trigger.querySelector('[data-dropdown-text]');
            if (trigger) {
                trigger.textContent = text;
            }
        }
    }

    /**
     * 关闭所有Dropdown
     */
    closeAll() {
        
        this.dropdowns.forEach((dropdown, id) => {
            if (dropdown.isOpen) {
                this.close(id);
            }
        });
    }

    /**
     * 获取状态
     * @returns {Object} 状态
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            config: this.config,
            activeDropdown: this.activeDropdown,
            totalDropdowns: this.dropdowns.size,
            openDropdowns: Array.from(this.dropdowns.values()).filter(d => d.isOpen).length
        };
    }
}

// 创建全局实例
export const dropdown = new Dropdown();