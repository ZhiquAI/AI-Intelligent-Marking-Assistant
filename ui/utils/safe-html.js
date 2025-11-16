/**
 * Safe HTML - 安全HTML操作工具
 * 替换危险的innerHTML使用，提供安全的DOM操作方法
 */

import { sanitizeHTML } from '../security/dom-sanitizer.js';

/**
 * 安全设置HTML内容
 * @param {Element} element - 目标元素
 * @param {string} html - HTML内容
 * @param {Object} options - 选项
 * @returns {boolean} 是否成功设置
 */
export function safeSetHTML(element, html, options = {}) {
    if (!element || !html) {
        console.warn('safeSetHTML: 无效的元素或HTML内容');
        return false;
    }

    try {
        // 净化HTML内容
        const sanitizedHTML = sanitizeHTML(html, options);

        // 清空元素内容
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }

        // 设置净化后的HTML
        element.innerHTML = sanitizedHTML;

        return true;
    } catch (error) {
        console.error('safeSetHTML: 设置HTML失败', error);
        return false;
    }
}

/**
 * 安全追加HTML内容
 * @param {Element} element - 目标元素
 * @param {string} html - HTML内容
 * @param {Object} options - 选项
 * @returns {boolean} 是否成功追加
 */
export function safeAppendHTML(element, html, options = {}) {
    if (!element || !html) {
        console.warn('safeAppendHTML: 无效的元素或HTML内容');
        return false;
    }

    try {
        // 净化HTML内容
        const sanitizedHTML = sanitizeHTML(html, options);

        // 创建临时容器
        const container = document.createElement('div');
        container.innerHTML = sanitizedHTML;

        // 追加子节点
        while (container.firstChild) {
            element.appendChild(container.firstChild);
        }

        return true;
    } catch (error) {
        console.error('safeAppendHTML: 追加HTML失败', error);
        return false;
    }
}

/**
 * 安全插入HTML内容
 * @param {Element} element - 目标元素
 * @param {string} html - HTML内容
 * @param {string} position - 插入位置 ('beforebegin', 'afterbegin', 'beforeend', 'afterend')
 * @param {Object} options - 选项
 * @returns {boolean} 是否成功插入
 */
export function safeInsertHTML(element, html, position = 'beforeend', options = {}) {
    if (!element || !html) {
        console.warn('safeInsertHTML: 无效的元素或HTML内容');
        return false;
    }

    const validPositions = ['beforebegin', 'afterbegin', 'beforeend', 'afterend'];
    if (!validPositions.includes(position)) {
        console.warn(`safeInsertHTML: 无效的插入位置: ${position}`);
        return false;
    }

    try {
        // 净化HTML内容
        const sanitizedHTML = sanitizeHTML(html, options);

        // 使用insertAdjacentHTML插入净化后的内容
        element.insertAdjacentHTML(position, sanitizedHTML);

        return true;
    } catch (error) {
        console.error('safeInsertHTML: 插入HTML失败', error);
        return false;
    }
}

/**
 * 安全替换HTML内容
 * @param {Element} element - 目标元素
 * @param {string} html - HTML内容
 * @param {Object} options - 选项
 * @returns {boolean} 是否成功替换
 */
export function safeReplaceHTML(element, html, options = {}) {
    return safeSetHTML(element, html, options);
}

/**
 * 安全创建元素并设置HTML
 * @param {string} tagName - 标签名
 * @param {Object} attributes - 属性对象
 * @param {string} html - HTML内容
 * @param {Object} options - 选项
 * @returns {Element|null} 创建的元素
 */
export function safeCreateElement(tagName, attributes = {}, html = '', options = {}) {
    if (!tagName) {
        console.warn('safeCreateElement: 无效的标签名');
        return null;
    }

    try {
        const element = document.createElement(tagName);

        // 设置属性
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'style' && typeof attributes[key] === 'object') {
                Object.assign(element.style, attributes[key]);
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, attributes[key]);
            } else if (key in element) {
                element[key] = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        // 设置HTML内容
        if (html) {
            safeSetHTML(element, html, options);
        }

        return element;
    } catch (error) {
        console.error('safeCreateElement: 创建元素失败', error);
        return null;
    }
}

/**
 * 安全设置文本内容
 * @param {Element} element - 目标元素
 * @param {string} text - 文本内容
 * @returns {boolean} 是否成功设置
 */
export function safeSetText(element, text) {
    if (!element) {
        console.warn('safeSetText: 无效的元素');
        return false;
    }

    try {
        // 使用textContent，避免XSS
        element.textContent = text || '';
        return true;
    } catch (error) {
        console.error('safeSetText: 设置文本失败', error);
        return false;
    }
}

/**
 * 安全获取文本内容
 * @param {Element} element - 目标元素
 * @returns {string} 文本内容
 */
export function safeGetText(element) {
    if (!element) {
        console.warn('safeGetText: 无效的元素');
        return '';
    }

    try {
        return element.textContent || '';
    } catch (error) {
        console.error('safeGetText: 获取文本失败', error);
        return '';
    }
}

/**
 * 安全创建文档片段
 * @param {string} html - HTML内容
 * @param {Object} options - 选项
 * @returns {DocumentFragment} 文档片段
 */
export function safeCreateFragment(html, options = {}) {
    try {
        const fragment = document.createDocumentFragment();

        if (html) {
            // 净化HTML内容
            const sanitizedHTML = sanitizeHTML(html, options);

            // 创建临时容器
            const container = document.createElement('div');
            container.innerHTML = sanitizedHTML;

            // 移动节点到片段
            while (container.firstChild) {
                fragment.appendChild(container.firstChild);
            }
        }

        return fragment;
    } catch (error) {
        console.error('safeCreateFragment: 创建文档片段失败', error);
        return document.createDocumentFragment();
    }
}

/**
 * HTML模板字符串工具
 * 使用模板标签函数自动净化HTML
 */
export function html(strings, ...values) {
    let result = '';

    for (let i = 0; i < strings.length; i++) {
        result += strings[i];

        if (i < values.length) {
            const value = values[i];

            // 转义字符串值
            if (typeof value === 'string') {
                result += escapeHtml(value);
            } else {
                // 其他类型转换为字符串并转义
                result += escapeHtml(String(value));
            }
        }
    }

    return result;
}

/**
 * 转义HTML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
    if (!text) return '';

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 反转义HTML特殊字符
 * @param {string} html - 要反转义的HTML
 * @returns {string} 反转义后的文本
 */
export function unescapeHtml(html) {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * 检查HTML是否安全
 * @param {string} html - HTML内容
 * @param {Object} options - 选项
 * @returns {Object} 检查结果
 */
export function checkHTMLSafety(html, options = {}) {
    try {
        const sanitizer = options.sanitizer || new (require('../security/dom-sanitizer.js').DOMSanitizer)(options);
        const originalHTML = html;
        const sanitizedHTML = sanitizer.sanitize(html);

        return {
            isSafe: originalHTML === sanitizedHTML,
            originalHTML,
            sanitizedHTML,
            violations: sanitizer.getViolations(),
            stats: sanitizer.getStats()
        };
    } catch (error) {
        return {
            isSafe: false,
            originalHTML: html,
            sanitizedHTML: '',
            error: error.message,
            violations: [],
            stats: null
        };
    }
}

/**
 * 批量替换元素的innerHTML
 * @param {Array} replacements - 替换配置数组
 * @param {Object} options - 选项
 */
export function batchSafeSetHTML(replacements, options = {}) {
    const results = [];

    replacements.forEach(({ element, html, opts = {} }) => {
        const result = safeSetHTML(element, html, { ...options, ...opts });
        results.push({
            element,
            html,
            success: result
        });
    });

    return results;
}

/**
 * 迁移助手 - 帮助从innerHTML迁移到安全方法
 */
export class InnerHTMLMigrator {
    constructor(options = {}) {
        this.options = {
            dryRun: false, // 是否为试运行
            logReplacements: true,
            autoFix: false, // 是否自动修复
            ...options
        };

        this.replacements = [];
        this.unsafeUsages = [];
    }

    /**
     * 扫描页面中的不安全innerHTML使用
     */
    scan() {
        this.unsafeUsages = [];

        // 扫描所有脚本标签中的innerHTML使用
        const scripts = document.querySelectorAll('script');

        scripts.forEach(script => {
            if (script.textContent) {
                const content = script.textContent;
                const matches = content.match(/\.innerHTML\s*=\s*['"`]([^'"`]*?)['"`]/g);

                if (matches) {
                    this.unsafeUsages.push({
                        type: 'script',
                        element: script,
                        matches,
                        content: content.substring(0, 200) + '...'
                    });
                }
            }
        });

        return this.unsafeUsages;
    }

    /**
     * 生成替换建议
     */
    generateReplacements() {
        this.replacements = [];

        this.unsafeUsages.forEach(usage => {
            const suggestion = {
                original: usage.matches[0],
                suggestion: usage.matches[0].replace('.innerHTML', '.safeSetHTML'),
                type: usage.type,
                element: usage.element
            };

            this.replacements.push(suggestion);
        });

        return this.replacements;
    }

    /**
     * 应用替换
     */
    applyReplacements() {
        if (this.options.dryRun) {
            console.log('试运行模式 - 以下是需要替换的innerHTML使用:');
            this.replacements.forEach(replacement => {
                console.log(`  ${replacement.original} -> ${replacement.suggestion}`);
            });
            return true;
        }

        let successCount = 0;

        this.replacements.forEach(replacement => {
            if (this.options.autoFix && replacement.type === 'script') {
                // 在实际项目中，这里需要更复杂的逻辑来修改源文件
                console.log(`建议替换: ${replacement.original} -> ${replacement.suggestion}`);
                successCount++;
            }
        });

        return successCount;
    }

    /**
     * 获取迁移报告
     */
    getReport() {
        return {
            totalUnsafeUsages: this.unsafeUsages.length,
            totalReplacements: this.replacements.length,
            replacements: this.replacements,
            unsafeUsages: this.unsafeUsages
        };
    }
}

// 创建默认的迁移器实例
export const defaultMigrator = new InnerHTMLMigrator();

// 导出到全局对象（仅在开发环境）
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.safeHTML = {
        safeSetHTML,
        safeAppendHTML,
        safeInsertHTML,
        safeReplaceHTML,
        safeCreateElement,
        safeSetText,
        safeGetText,
        safeCreateFragment,
        html,
        escapeHtml,
        unescapeHtml,
        checkHTMLSafety,
        batchSafeSetHTML,
        InnerHTMLMigrator,
        defaultMigrator
    };
}

// 默认导出
export default {
    safeSetHTML,
    safeAppendHTML,
    safeInsertHTML,
    safeReplaceHTML,
    safeCreateElement,
    safeSetText,
    safeGetText,
    safeCreateFragment,
    html,
    escapeHtml,
    unescapeHtml,
    checkHTMLSafety,
    batchSafeSetHTML,
    InnerHTMLMigrator,
    defaultMigrator
};