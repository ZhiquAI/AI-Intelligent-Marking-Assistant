/**
 * DOM Utility Functions
 * DOM工具函数 - 提供常用的DOM操作功能
 */

/**
 * 创建DOM元素
 * @param {string} tagName - 元素标签名
 * @param {Object} options - 元素选项
 * @param {string} options.className - CSS类名
 * @param {string} options.id - 元素ID
 * @param {string} options.innerHTML - 内部HTML
 * @param {string} options.textContent - 文本内容
 * @param {Object} options.attributes - 属性对象
 * @param {Object} options.styles - 样式对象
 * @param {Array<HTMLElement>} options.children - 子元素数组
 * @returns {HTMLElement} 创建的DOM元素
 */
export function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) {
        element.className = options.className;
    }

    if (options.id) {
        element.id = options.id;
    }

    if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
    }

    if (options.textContent) {
        element.textContent = options.textContent;
    }

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    if (options.styles) {
        Object.assign(element.style, options.styles);
    }

    if (options.children) {
        options.children.forEach(child => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }

    return element;
}

/**
 * 添加CSS类
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - CSS类名
 */
export function addClass(element, className) {
    if (element && typeof className === 'string') {
        element.classList.add(className);
    }
}

/**
 * 移除CSS类
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - CSS类名
 */
export function removeClass(element, className) {
    if (element && typeof className === 'string') {
        element.classList.remove(className);
    }
}

/**
 * 切换CSS类
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - CSS类名
 * @param {boolean} force - 强制添加或移除
 */
export function toggleClass(element, className, force) {
    if (element && typeof className === 'string') {
        element.classList.toggle(className, force);
    }
}

/**
 * 检查是否包含CSS类
 * @param {HTMLElement} element - DOM元素
 * @param {string} className - CSS类名
 * @returns {boolean} 是否包含类名
 */
export function hasClass(element, className) {
    if (element && typeof className === 'string') {
        return element.classList.contains(className);
    }
    return false;
}

/**
 * 获取元素位置信息
 * @param {HTMLElement} element - DOM元素
 * @returns {Object} 位置信息 {top, left, right, bottom, width, height}
 */
export function getElementPosition(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
        height: rect.height
    };
}

/**
 * 等待元素出现
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<HTMLElement>} 元素Promise
 */
export function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖函数
 */
export function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 平滑滚动到元素
 * @param {HTMLElement} element - 目标元素
 * @param {Object} options - 滚动选项
 */
export function smoothScrollTo(element, options = {}) {
    if (!element) return;

    const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
    };

    element.scrollIntoView({ ...defaultOptions, ...options });
}

/**
 * 获取或设置元素数据属性
 * @param {HTMLElement} element - DOM元素
 * @param {string} key - 数据键
 * @param {*} value - 数据值（可选）
 * @returns {*} 数据值或undefined
 */
export function data(element, key, value) {
    if (!element || typeof key !== 'string') return;

    if (value !== undefined) {
        element.dataset[key] = value;
        return value;
    }

    return element.dataset[key];
}

/**
 * 创建模态框背景
 * @param {Object} options - 选项
 * @returns {HTMLElement} 背景元素
 */
export function createModalBackdrop(options = {}) {
    const backdrop = createElement('div', {
        className: 'modal-backdrop',
        styles: {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        }
    });

    // Auto show with animation
    setTimeout(() => {
        backdrop.style.opacity = '1';
    }, 10);

    if (options.onClick) {
        backdrop.addEventListener('click', options.onClick);
    }

    return backdrop;
}

/**
 * 安全地移除元素
 * @param {HTMLElement} element - 要移除的元素
 */
export function safeRemove(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

/**
 * 获取元素的计算样式
 * @param {HTMLElement} element - DOM元素
 * @param {string} property - CSS属性名
 * @returns {string} 属性值
 */
export function getComputedStyle(element, property) {
    if (!element) return '';

    const styles = window.getComputedStyle(element);
    return property ? styles.getPropertyValue(property) : styles;
}

/**
 * 检查元素是否在视口中
 * @param {HTMLElement} element - DOM元素
 * @param {number} threshold - 阈值（0-1）
 * @returns {boolean} 是否在视口中
 */
export function isInViewport(element, threshold = 0.5) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
    const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

    return vertInView && horInView;
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise} Promise
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        return true;
    } catch (error) {
        // console.error('Failed to copy text to clipboard:', error);
        return false;
    }
}
