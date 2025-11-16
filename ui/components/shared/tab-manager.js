/**
 * TabManager - 标签页管理组件
 * 提供强大的标签页管理功能，支持历史记录、键盘导航、懒加载等
 */

/**
 * 标签页管理器类
 */
export class TabManager {
    constructor(root, options = {}) {
        this.options = {
            tabSelector: '.zhixue-ai-tab, .tab-button, [data-tab]',
            contentSelector: '.tab-content, [data-tab-content]',
            activeClass: 'active',
            rememberState: true,
            keyboardNavigation: true,
            lazyLoad: false,
            animationDuration: 300,
            historyTracking: false,
            defaultTab: null,
            beforeSwitch: null,
            afterSwitch: null,
            onTabShow: null,
            onTabHide: null,
            ...options
        };

        this.root = root;
        this.tabs = [];
        this.contents = [];
        this.activeTab = null;
        this.tabHistory = [];
        this.maxHistoryLength = 10;
        this.isDestroyed = false;
        this.animationFrameId = null;

        this.init();
    }

    /**
     * 初始化标签页管理器
     */
    init() {
        this.cacheElements();
        if (this.tabs.length === 0) {
            console.warn('TabManager: 未找到标签页元素');
            return;
        }

        this.bindEvents();
        this.loadInitialState();
        this.bindKeyboardNavigation();
    }

    /**
     * 缓存标签页元素
     */
    cacheElements() {
        this.tabs = Array.from(this.root.querySelectorAll(this.options.tabSelector))
            .filter(tab => tab.dataset.tab);

        this.contents = Array.from(this.root.querySelectorAll(this.options.contentSelector))
            .filter(content => content.id || content.dataset.tabContent);

        // 创建标签页和内容的映射关系
        this.tabMap = new Map();
        this.contentMap = new Map();

        this.tabs.forEach(tab => {
            const tabName = tab.dataset.tab;
            this.tabMap.set(tabName, tab);

            // 查找对应的内容
            const content = this.findContentForTab(tabName);
            if (content) {
                this.contentMap.set(tabName, content);
            }
        });
    }

    /**
     * 查找标签页对应的内容
     */
    findContentForTab(tabName) {
        // 通过ID查找
        let content = this.root.querySelector(`#tab-${tabName}`);
        if (content) return content;

        // 通过data属性查找
        content = this.root.querySelector(`[data-tab-content="${tabName}"]`);
        if (content) return content;

        // 在所有内容中查找
        return this.contents.find(c => {
            const id = c.id.replace('tab-', '');
            const name = c.dataset.tabContent;
            return id === tabName || name === tabName;
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        this.tabClickHandlers = new Map();

        this.tabs.forEach(tab => {
            const handler = (e) => {
                e.preventDefault();
                const tabName = tab.dataset.tab;
                this.switchTo(tabName, { trigger: 'click', event: e });
            };

            tab.addEventListener('click', handler);
            this.tabClickHandlers.set(tab, handler);
        });
    }

    /**
     * 绑定键盘导航
     */
    bindKeyboardNavigation() {
        if (!this.options.keyboardNavigation) return;

        this.keyHandler = (e) => {
            if (this.isDestroyed) return;

            // Alt/Ctrl + 数字键切换标签页
            if ((e.altKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
                const tabIndex = parseInt(e.key) - 1;
                if (tabIndex < this.tabs.length) {
                    e.preventDefault();
                    const tab = this.tabs[tabIndex];
                    this.switchTo(tab.dataset.tab, { trigger: 'keyboard', event: e });
                }
            }

            // 左右箭头键切换标签页
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const currentTabElement = this.tabMap.get(this.activeTab);
                if (currentTabElement && document.activeElement === currentTabElement) {
                    e.preventDefault();
                    const currentIndex = this.tabs.indexOf(currentTabElement);
                    let newIndex = currentIndex;

                    if (e.key === 'ArrowLeft') {
                        newIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
                    } else {
                        newIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
                    }

                    const newTab = this.tabs[newIndex];
                    this.switchTo(newTab.dataset.tab, { trigger: 'keyboard', event: e });
                    newTab.focus();
                }
            }
        };

        document.addEventListener('keydown', this.keyHandler);
    }

    /**
     * 加载初始状态
     */
    loadInitialState() {
        let initialTab = this.options.defaultTab;

        // 尝试从URL hash加载
        if (this.options.historyTracking && window.location.hash) {
            const hashTab = window.location.hash.substring(1);
            if (this.tabMap.has(hashTab)) {
                initialTab = hashTab;
            }
        }

        // 尝试从本地存储加载
        if (this.options.rememberState && !initialTab) {
            const storageKey = `tabmanager_${this.getStorageKey()}_activeTab`;
            initialTab = localStorage.getItem(storageKey);
        }

        // 使用第一个标签页作为默认值
        if (!initialTab || !this.tabMap.has(initialTab)) {
            initialTab = this.tabs[0]?.dataset.tab;
        }

        if (initialTab) {
            this.switchTo(initialTab, { trigger: 'init', silent: true });
        }
    }

    /**
     * 切换到指定标签页
     * @param {string} tabName - 标签页名称
     * @param {Object} options - 选项
     */
    async switchTo(tabName, options = {}) {
        if (this.isDestroyed || !tabName || !this.tabMap.has(tabName)) {
            console.warn(`TabManager: 标签页 "${tabName}" 不存在`);
            return false;
        }

        // 如果已经是当前标签页，直接返回
        if (this.activeTab === tabName && !options.force) {
            return true;
        }

        const tab = this.tabMap.get(tabName);
        const content = this.contentMap.get(tabName);

        if (!tab) {
            console.warn(`TabManager: 标签页元素 "${tabName}" 不存在`);
            return false;
        }

        // 执行切换前的回调
        const canSwitch = await this.executeCallback(this.options.beforeSwitch, {
            fromTab: this.activeTab,
            toTab: tabName,
            tab,
            content,
            trigger: options.trigger || 'manual'
        });

        if (canSwitch === false) {
            return false;
        }

        try {
            // 隐藏当前标签页内容
            if (this.activeTab) {
                await this.hideTab(this.activeTab);
            }

            // 显示新标签页内容
            await this.showTab(tabName, options);

            // 更新历史记录
            this.addToHistory(tabName);

            // 保存状态
            this.saveState(tabName);

            // 触发自定义事件
            this.dispatchEvents(tabName, options);

            // 执行切换后的回调
            this.executeCallback(this.options.afterSwitch, {
                fromTab: this.activeTab,
                toTab: tabName,
                tab,
                content,
                trigger: options.trigger || 'manual'
            });

            return true;
        } catch (error) {
            console.error('TabManager: 标签页切换失败', error);
            return false;
        }
    }

    /**
     * 显示标签页
     */
    async showTab(tabName, options = {}) {
        const tab = this.tabMap.get(tabName);
        const content = this.contentMap.get(tabName);

        if (!tab) return;

        // 激活标签页按钮
        this.tabs.forEach(t => {
            if (t === tab) {
                t.classList.add(this.options.activeClass);
                t.setAttribute('aria-selected', 'true');
            } else {
                t.classList.remove(this.options.activeClass);
                t.setAttribute('aria-selected', 'false');
            }
        });

        // 显示内容
        if (content) {
            // 懒加载内容
            if (this.options.lazyLoad && content.dataset.lazyLoad) {
                await this.loadLazyContent(content, tabName);
            }

            // 应用动画
            if (this.options.animationDuration > 0 && !options.silent) {
                await this.animateContent(content, 'show');
            } else {
                content.style.display = '';
                content.classList.remove('hidden');
            }

            // 触发显示回调
            this.executeCallback(this.options.onTabShow, {
                tabName,
                content,
                trigger: options.trigger || 'manual'
            });
        }

        this.activeTab = tabName;
    }

    /**
     * 隐藏标签页
     */
    async hideTab(tabName) {
        const content = this.contentMap.get(tabName);
        if (!content) return;

        // 触发隐藏回调
        this.executeCallback(this.options.onTabHide, {
            tabName,
            content,
            trigger: 'manual'
        });

        // 应用动画
        if (this.options.animationDuration > 0) {
            await this.animateContent(content, 'hide');
        } else {
            content.style.display = 'none';
            content.classList.add('hidden');
        }
    }

    /**
     * 动画效果
     */
    async animateContent(content, action) {
        return new Promise((resolve) => {
            // 取消之前的动画
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }

            content.style.transition = `opacity ${this.options.animationDuration}ms ease-in-out`;

            if (action === 'show') {
                content.style.display = '';
                content.classList.remove('hidden');
                content.style.opacity = '0';

                this.animationFrameId = requestAnimationFrame(() => {
                    content.style.opacity = '1';
                    setTimeout(resolve, this.options.animationDuration);
                });
            } else {
                content.style.opacity = '0';
                setTimeout(() => {
                    content.style.display = 'none';
                    content.classList.add('hidden');
                    resolve();
                }, this.options.animationDuration);
            }
        });
    }

    /**
     * 懒加载内容
     */
    async loadLazyContent(content, tabName) {
        if (!content.dataset.lazyLoad) return;

        const loadUrl = content.dataset.lazyLoad;
        try {
            const response = await fetch(loadUrl);
            const html = await response.text();

            // 使用安全的HTML设置方法
            if (window.safeSetHTML) {
                window.safeSetHTML(content, html);
            } else {
                content.innerHTML = html;
            }

            // 清除懒加载标记
            delete content.dataset.lazyLoad;

            // 触发内容加载事件
            content.dispatchEvent(new CustomEvent('contentLoaded', {
                detail: { tabName, loadUrl }
            }));
        } catch (error) {
            console.error(`TabManager: 懒加载失败 "${tabName}"`, error);
            content.textContent = '加载失败';
        }
    }

    /**
     * 添加到历史记录
     */
    addToHistory(tabName) {
        // 移除重复项
        this.tabHistory = this.tabHistory.filter(name => name !== tabName);

        // 添加到末尾
        this.tabHistory.push(tabName);

        // 限制历史记录长度
        if (this.tabHistory.length > this.maxHistoryLength) {
            this.tabHistory.shift();
        }
    }

    /**
     * 保存状态到本地存储
     */
    saveState(tabName) {
        if (this.options.rememberState) {
            const storageKey = `tabmanager_${this.getStorageKey()}_activeTab`;
            try {
                localStorage.setItem(storageKey, tabName);
            } catch (error) {
                console.warn('TabManager: 无法保存到本地存储', error);
            }
        }

        // 更新URL hash
        if (this.options.historyTracking) {
            const newHash = `#${tabName}`;
            if (window.location.hash !== newHash) {
                history.pushState({ tabName }, '', newHash);
            }
        }
    }

    /**
     * 获取存储键
     */
    getStorageKey() {
        return this.root.id || this.root.className || 'default';
    }

    /**
     * 触发事件
     */
    dispatchEvents(tabName, options) {
        const eventData = {
            tabName,
            tab: this.tabMap.get(tabName),
            content: this.contentMap.get(tabName),
            trigger: options.trigger || 'manual',
            history: [...this.tabHistory]
        };

        // 触发DOM事件
        this.root.dispatchEvent(new CustomEvent('tab-switched', { detail: eventData }));

        // 尝试通过事件管理器触发
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                const eventManagerPath = chrome.runtime.getURL('ui/utils/event-manager.js');
                import(eventManagerPath).then(module => {
                    module.emit('ui/tab-switched', eventData);
                }).catch(() => {});
            }
        } catch (error) {
            // 忽略事件管理器错误
        }
    }

    /**
     * 执行回调函数
     */
    async executeCallback(callback, data) {
        if (typeof callback !== 'function') return true;

        try {
            const result = await callback(data);
            return result !== false;
        } catch (error) {
            console.error('TabManager: 回调执行失败', error);
            return true;
        }
    }

    /**
     * 获取当前活动标签页
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * 获取所有标签页名称
     */
    getTabNames() {
        return Array.from(this.tabMap.keys());
    }

    /**
     * 获取标签页历史记录
     */
    getHistory() {
        return [...this.tabHistory];
    }

    /**
     * 后退到上一个标签页
     */
    back() {
        if (this.tabHistory.length > 1) {
            this.tabHistory.pop(); // 移除当前标签页
            const previousTab = this.tabHistory.pop();
            if (previousTab) {
                return this.switchTo(previousTab, { trigger: 'history' });
            }
        }
        return false;
    }

    /**
     * 添加新标签页
     */
    addTab(tabName, tabElement, contentElement) {
        if (this.tabMap.has(tabName)) {
            console.warn(`TabManager: 标签页 "${tabName}" 已存在`);
            return false;
        }

        // 设置标签页属性
        tabElement.dataset.tab = tabName;
        tabElement.setAttribute('role', 'tab');
        tabElement.setAttribute('aria-controls', `tab-${tabName}`);

        // 设置内容属性
        if (contentElement) {
            contentElement.id = `tab-${tabName}`;
            contentElement.setAttribute('role', 'tabpanel');
            contentElement.setAttribute('aria-labelledby', tabName);
        }

        // 添加到DOM
        if (!this.root.contains(tabElement)) {
            this.root.appendChild(tabElement);
        }
        if (contentElement && !this.root.contains(contentElement)) {
            this.root.appendChild(contentElement);
        }

        // 更新缓存
        this.cacheElements();

        // 绑定事件
        const handler = (e) => {
            e.preventDefault();
            this.switchTo(tabName, { trigger: 'click', event: e });
        };
        tabElement.addEventListener('click', handler);
        this.tabClickHandlers.set(tabElement, handler);

        return true;
    }

    /**
     * 移除标签页
     */
    removeTab(tabName) {
        const tab = this.tabMap.get(tabName);
        const content = this.contentMap.get(tabName);

        if (!tab) return false;

        // 如果移除的是当前标签页，切换到其他标签页
        if (this.activeTab === tabName) {
            const remainingTabs = this.getTabNames().filter(name => name !== tabName);
            if (remainingTabs.length > 0) {
                this.switchTo(remainingTabs[0], { trigger: 'remove' });
            }
        }

        // 移除事件监听
        const handler = this.tabClickHandlers.get(tab);
        if (handler) {
            tab.removeEventListener('click', handler);
            this.tabClickHandlers.delete(tab);
        }

        // 移除DOM元素
        tab.remove();
        if (content) {
            content.remove();
        }

        // 更新缓存
        this.cacheElements();

        return true;
    }

    /**
     * 启用/禁用标签页
     */
    setTabEnabled(tabName, enabled) {
        const tab = this.tabMap.get(tabName);
        if (!tab) return;

        if (enabled) {
            tab.removeAttribute('disabled');
            tab.setAttribute('aria-disabled', 'false');
            tab.classList.remove('disabled');
        } else {
            tab.setAttribute('disabled', 'true');
            tab.setAttribute('aria-disabled', 'true');
            tab.classList.add('disabled');
        }
    }

    /**
     * 销毁标签页管理器
     */
    destroy() {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        // 移除事件监听
        this.tabClickHandlers.forEach((handler, tab) => {
            tab.removeEventListener('click', handler);
        });
        this.tabClickHandlers.clear();

        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }

        // 取消动画
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // 清理数据
        this.tabMap.clear();
        this.contentMap.clear();
        this.tabs = [];
        this.contents = [];
        this.tabHistory = [];
        this.activeTab = null;
    }
}

/**
 * 全局标签页管理器注册表
 */
export const tabManagerRegistry = new Map();

/**
 * 便捷函数：创建标签页管理器
 * @param {HTMLElement|string} root - 根元素或选择器
 * @param {Object} options - 选项
 * @returns {TabManager} 标签页管理器实例
 */
export function createTabManager(root, options = {}) {
    const element = typeof root === 'string' ? document.querySelector(root) : root;
    if (!element) {
        throw new Error(`TabManager: 根元素 "${root}" 不存在`);
    }

    const manager = new TabManager(element, options);

    // 注册管理器
    const id = options.id || `tabmanager_${Date.now()}`;
    tabManagerRegistry.set(id, manager);

    return manager;
}

/**
 * 便捷函数：获取标签页管理器
 * @param {string} id - 管理器ID
 * @returns {TabManager|null} 标签页管理器实例
 */
export function getTabManager(id) {
    return tabManagerRegistry.get(id) || null;
}

/**
 * 便捷函数：销毁标签页管理器
 * @param {string} id - 管理器ID
 */
export function destroyTabManager(id) {
    const manager = tabManagerRegistry.get(id);
    if (manager) {
        manager.destroy();
        tabManagerRegistry.delete(id);
        return true;
    }
    return false;
}

export default {
    TabManager,
    createTabManager,
    getTabManager,
    destroyTabManager,
    tabManagerRegistry
};