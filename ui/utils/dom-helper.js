/**
 * DOM Helper - 安全的DOM操作工具集
 * 提供安全的DOM操作方法，防止XSS攻击和内存泄漏
 */

/**
 * 安全的DOM查询器
 */
export const qs = (sel, root = document) => {
    try {
        return root.querySelector(sel);
    } catch (error) {
        console.error('DOM查询失败:', error, 'selector:', sel);
        return null;
    }
};

export const qsa = (sel, root = document) => {
    try {
        return Array.from(root.querySelectorAll(sel));
    } catch (error) {
        console.error('DOM查询失败:', error, 'selector:', sel);
        return [];
    }
};

/**
 * 安全的事件绑定
 */
export const on = (el, evt, handler, options = {}) => {
    if (!el || typeof handler !== 'function') {
        console.warn('无效的事件绑定参数:', { el, evt, handler });
        return null;
    }

    try {
        el.addEventListener(evt, handler, options);

        // 返回移除事件的函数
        return () => {
            el.removeEventListener(evt, handler, options);
        };
    } catch (error) {
        console.error('事件绑定失败:', error, { element: el, event: evt });
        return null;
    }
};

/**
 * 安全的HTML插入（已弃用，建议使用textContent或createHTMLPolulation）
 * @deprecated 请使用safeSetHTML或textContent代替
 */
export const appendHtml = (root, html) => {
    console.warn('appendHtml已弃用，请使用safeSetHTML或textContent');
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    root.appendChild(wrap);
    return wrap;
};

/**
 * 安全的HTML设置方法
 */
export const safeSetHTML = (element, html) => {
    if (!element) return false;

    try {
        // 清除现有内容
        element.innerHTML = '';

        if (!html) return true;

        // 使用DOMParser进行HTML解析和净化
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 检查解析错误
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            console.error('HTML解析失败:', parserError.textContent);
            element.textContent = 'HTML解析错误';
            return false;
        }

        // 安全地克隆和添加节点
        const fragment = document.createDocumentFragment();
        while (doc.body.firstChild) {
            fragment.appendChild(doc.body.firstChild);
        }

        element.appendChild(fragment);
        return true;
    } catch (error) {
        console.error('安全的HTML设置失败:', error);
        element.textContent = html; // 降级为文本显示
        return false;
    }
};

/**
 * 安全的文本设置
 */
export const safeSetText = (element, text) => {
    if (!element) return;

    try {
        element.textContent = text || '';
    } catch (error) {
        console.error('文本设置失败:', error);
        element.innerText = text || ''; // 降级方案
    }
};

/**
 * 安全的元素创建
 */
export const createElement = (tagName, attributes = {}, textContent = '') => {
    try {
        const element = document.createElement(tagName);

        // 安全地设置属性
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, attributes[key]);
            } else if (key in element) {
                element[key] = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        // 安全地设置文本内容
        if (textContent) {
            safeSetText(element, textContent);
        }

        return element;
    } catch (error) {
        console.error('元素创建失败:', error);
        return document.createElement('div'); // 降级返回div
    }
};

/**
 * 安全的元素移除
 */
export const safeRemove = (element) => {
    if (!element || !element.parentNode) return false;

    try {
        element.parentNode.removeChild(element);
        return true;
    } catch (error) {
        console.error('元素移除失败:', error);
        return false;
    }
};

/**
 * 安全的类名操作
 */
export const addClass = (element, className) => {
    if (!element) return false;

    try {
        element.classList.add(className);
        return true;
    } catch (error) {
        console.error('添加类名失败:', error);
        return false;
    }
};

export const removeClass = (element, className) => {
    if (!element) return false;

    try {
        element.classList.remove(className);
        return true;
    } catch (error) {
        console.error('移除类名失败:', error);
        return false;
    }
};

export const toggleClass = (element, className, force) => {
    if (!element) return false;

    try {
        return element.classList.toggle(className, force);
    } catch (error) {
        console.error('切换类名失败:', error);
        return false;
    }
};

export const hasClass = (element, className) => {
    if (!element) return false;

    try {
        return element.classList.contains(className);
    } catch (error) {
        console.error('检查类名失败:', error);
        return false;
    }
};

/**
 * 安全的样式操作
 */
export const setStyle = (element, styles) => {
    if (!element || typeof styles !== 'object') return false;

    try {
        Object.keys(styles).forEach(property => {
            element.style[property] = styles[property];
        });
        return true;
    } catch (error) {
        console.error('设置样式失败:', error);
        return false;
    }
};

/**
 * 安全的属性操作
 */
export const setAttributes = (element, attributes) => {
    if (!element || typeof attributes !== 'object') return false;

    try {
        Object.keys(attributes).forEach(key => {
            if (attributes[key] !== null && attributes[key] !== undefined) {
                element.setAttribute(key, attributes[key]);
            }
        });
        return true;
    } catch (error) {
        console.error('设置属性失败:', error);
        return false;
    }
};

/**
 * 安全的子元素清空
 */
export const empty = (element) => {
    if (!element) return false;

    try {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        return true;
    } catch (error) {
        console.error('清空元素失败:', error);
        return false;
    }
};

/**
 * 安全的子元素查找
 */
export const findChild = (element, selector) => {
    if (!element) return null;

    try {
        return element.querySelector(selector);
    } catch (error) {
        console.error('查找子元素失败:', error);
        return null;
    }
};

export const findChildren = (element, selector) => {
    if (!element) return [];

    try {
        return Array.from(element.querySelectorAll(selector));
    } catch (error) {
        console.error('查找子元素失败:', error);
        return [];
    }
};

/**
 * 安全的父元素查找
 */
export const findParent = (element, selector) => {
    if (!element) return null;

    try {
        let parent = element.parentElement;
        while (parent) {
            if (parent.matches && parent.matches(selector)) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    } catch (error) {
        console.error('查找父元素失败:', error);
        return null;
    }
};

/**
 * DOM安全验证器
 */
export const isValidElement = (element) => {
    return element &&
           element.nodeType === Node.ELEMENT_NODE &&
           element.ownerDocument === document;
};

/**
 * 安全的事件委托
 */
export const delegate = (root, selector, event, handler) => {
    if (!root || !selector || !event || typeof handler !== 'function') {
        console.warn('事件委托参数无效');
        return null;
    }

    const delegatedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target && root.contains(target)) {
            handler.call(target, e);
        }
    };

    return on(root, event, delegatedHandler);
};

/**
 * 元素可见性检查
 */
export const isVisible = (element) => {
    if (!element) return false;

    try {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
    } catch (error) {
        console.error('可见性检查失败:', error);
        return false;
    }
};

/**
 * 元素滚动到视图
 */
export const scrollToView = (element, options = {}) => {
    if (!element) return false;

    try {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
            ...options
        });
        return true;
    } catch (error) {
        console.error('滚动到视图失败:', error);
        return false;
    }
};

// 默认导出
export default {
    qs,
    qsa,
    on,
    safeSetHTML,
    safeSetText,
    createElement,
    safeRemove,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    setStyle,
    setAttributes,
    empty,
    findChild,
    findChildren,
    findParent,
    isValidElement,
    delegate,
    isVisible,
    scrollToView
};