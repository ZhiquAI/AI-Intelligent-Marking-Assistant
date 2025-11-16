/**
 * DOM安全操作工具模块
 * @module dom-safety
 * @description 提供安全的DOM操作方法,防止XSS攻击
 */

import { validateData, securityCheck, escapeHtml } from './security-utils.js';

/**
 * DOM安全操作类
 */
class DomSafety {
    constructor() {
        // 配置允许的标签和属性
        this.allowedTags = [
            'div',
            'span',
            'p',
            'a',
            'strong',
            'em',
            'b',
            'i',
            'u',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'br',
            'hr',
            'ul',
            'ol',
            'li',
            'blockquote',
            'code',
            'pre',
            'table',
            'thead',
            'tbody',
            'tr',
            'td',
            'th'
        ];

        this.allowedAttributes = {
            a: ['href', 'title', 'class', 'id'],
            img: ['src', 'alt', 'title', 'class', 'id'],
            div: ['class', 'id', 'title'],
            span: ['class', 'id', 'title'],
            p: ['class', 'id'],
            h1: ['class', 'id'],
            h2: ['class', 'id'],
            h3: ['class', 'id'],
            h4: ['class', 'id'],
            h5: ['class', 'id'],
            h6: ['class', 'id'],
            table: ['class', 'id'],
            td: ['class', 'id', 'colspan', 'rowspan'],
            th: ['class', 'id', 'colspan', 'rowspan'],
            tr: ['class', 'id'],
            code: ['class'],
            pre: ['class'],
            blockquote: ['class', 'cite']
        };
    }

    /**
     * 安全地设置元素的innerHTML
     * @param {Element} element - DOM元素
     * @param {string} html - HTML内容
     * @param {Object} options - 选项
     * @returns {boolean} 是否成功
     */
    safeInnerHTML(element, html, options = {}) {
        try {
            if (!element || typeof html !== 'string') {
                // // // console.error('无效的参数');
                return false;
            }

            const { allowScripts = false, allowEvents = false, sanitize = true } = options;

            // 如果不允许脚本,移除所有脚本标签
            if (!allowScripts) {
                html = this.removeScripts(html);
            }

            // 如果不允许事件,移除所有事件属性
            if (!allowEvents) {
                html = this.removeEventAttributes(html);
            }

            // 如果需要清理,进行HTML清理
            if (sanitize) {
                html = this.sanitizeHtml(html);
            }

            // 最终安全检查
            if (!this.isSafeHtml(html)) {
                // // console.error('HTML内容未通过安全检查');
                return false;
            }

            element.innerHTML = html;
            return true;
        } catch (error) {
            // console.error('安全设置innerHTML失败:', error);
            return false;
        }
    }

    /**
     * 安全地创建HTML元素
     * @param {string} html - HTML字符串
     * @param {Object} options - 选项
     * @returns {DocumentFragment} 文档片段
     */
    safeCreateElement(html, options = {}) {
        try {
            const { sanitize = true } = options;

            if (sanitize) {
                html = this.sanitizeHtml(html);
            }

            const template = document.createElement('template');
            template.innerHTML = html;

            return template.content.cloneNode(true);
        } catch (error) {
            // console.error('安全创建元素失败:', error);
            return document.createDocumentFragment();
        }
    }

    /**
     * 使用textContent替代innerHTML（推荐方式）
     * @param {Element} element - DOM元素
     * @param {string} text - 文本内容
     * @param {Object} options - 选项
     * @returns {boolean} 是否成功
     */
    safeTextContent(element, text, options = {}) {
        try {
            if (!element || typeof text !== 'string') {
                // // // console.error('无效的参数');
                return false;
            }

            const { escapeHtml = true, allowLineBreaks = true } = options;

            if (escapeHtml) {
                text = escapeHtml(text);
            }

            // 如果允许换行,将换行符转换为<br>
            if (allowLineBreaks) {
                text = text.replace(/\n/g, '<br>');
            }

            // 使用textContent而不是innerHTML
            if (allowLineBreaks) {
                // 如果需要换行,创建文本节点
                element.innerHTML = ''; // 清空现有内容
                const lines = text.split('<br>');
                lines.forEach((line, index) => {
                    if (index > 0) {
                        element.appendChild(document.createElement('br'));
                    }
                    element.appendChild(document.createTextNode(line));
                });
            } else {
                element.textContent = text;
            }

            return true;
        } catch (error) {
            // console.error('安全设置textContent失败:', error);
            return false;
        }
    }

    /**
     * 清理HTML内容
     * @param {string} html - HTML内容
     * @returns {string} 清理后的HTML
     */
    sanitizeHtml(html) {
        try {
            // 创建临时元素进行解析
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // 清理不需要的元素
            this.cleanElement(temp);

            return temp.innerHTML;
        } catch (error) {
            // console.error('HTML清理失败:', error);
            return '';
        }
    }

    /**
     * 递归清理元素
     * @param {Element} element - 要清理的元素
     */
    cleanElement(element) {
        const children = Array.from(element.children);

        children.forEach(child => {
            const tagName = child.tagName.toLowerCase();

            // 移除不允许的标签
            if (!this.allowedTags.includes(tagName)) {
                // 将内容移动到父元素
                while (child.firstChild) {
                    element.insertBefore(child.firstChild, child);
                }
                element.removeChild(child);
                return;
            }

            // 清理属性
            this.cleanAttributes(child);

            // 递归清理子元素
            this.cleanElement(child);
        });
    }

    /**
     * 清理元素属性
     * @param {Element} element - 要清理的元素
     */
    cleanAttributes(element) {
        const tagName = element.tagName.toLowerCase();
        const allowedAttrs = this.allowedAttributes[tagName] || [];

        Array.from(element.attributes).forEach(attr => {
            if (!allowedAttrs.includes(attr.name)) {
                element.removeAttribute(attr.name);
            }
        });

        // 特殊处理:验证href属性
        if (element.tagName.toLowerCase() === 'a' && element.href) {
            try {
                const url = new URL(element.href);
                if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
                    element.removeAttribute('href');
                }
            } catch (error) {
                // 无效的URL,移除href
                element.removeAttribute('href');
            }
        }
    }

    /**
     * 移除脚本标签
     * @param {string} html - HTML内容
     * @returns {string} 移除脚本后的HTML
     */
    removeScripts(html) {
        return html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    }

    /**
     * 移除事件属性
     * @param {string} html - HTML内容
     * @returns {string} 移除事件属性后的HTML
     */
    removeEventAttributes(html) {
        return html.replace(/\s+on\w+\s*=\s*["']?[^"'> ]*["']?/gi, '');
    }

    /**
     * 检查HTML是否安全
     * @param {string} html - HTML内容
     * @returns {boolean} 是否安全
     */
    isSafeHtml(html) {
        // 检查危险模式
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i,
            /eval\s*\(/i,
            /expression\s*\(/i,
            /data:text\/html/i
        ];

        return !dangerousPatterns.some(pattern => pattern.test(html));
    }

    /**
     * 安全地插入HTML到指定位置
     * @param {Element} parent - 父元素
     * @param {string} html - HTML内容
     * @param {string} position - 插入位置 (beforebegin, afterbegin, beforeend, afterend)
     * @param {Object} options - 选项
     * @returns {boolean} 是否成功
     */
    safeInsertAdjacentHTML(parent, html, position = 'beforeend', options = {}) {
        try {
            if (!parent || typeof html !== 'string') {
                // // // console.error('无效的参数');
                return false;
            }

            const validPositions = ['beforebegin', 'afterbegin', 'beforeend', 'afterend'];
            if (!validPositions.includes(position)) {
                // console.error('无效的插入位置');
                return false;
            }

            const { sanitize = true } = options;

            if (sanitize) {
                html = this.sanitizeHtml(html);
            }

            if (!this.isSafeHtml(html)) {
                // // console.error('HTML内容未通过安全检查');
                return false;
            }

            parent.insertAdjacentHTML(position, html);
            return true;
        } catch (error) {
            // console.error('安全插入HTML失败:', error);
            return false;
        }
    }

    /**
     * 创建安全的模板函数
     * @param {string} template - 模板字符串
     * @returns {Function} 安全的模板函数
     */
    createSafeTemplate(template) {
        data = {}; return data; => {
            try {
                let result = template;

                // 替换占位符,同时进行HTML转义
                Object.keys(data).forEach(key => {
                    const value = data[key];
                    const escapedValue = typeof value === 'string' ? escapeHtml(value) : value;
                    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
                    result = result.replace(regex, escapedValue);
                });

                return result;
            } catch (error) {
                // console.error('安全模板渲染失败:', error);
                return '';
            }
        };
    }

    /**
     * 验证用户输入
     * @param {string} input - 用户输入
     * @param {Object} rules - 验证规则
     * @returns {Object} 验证结果
     */
    validateInput(input, rules = {}) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: input
        };

        try {
            const {
                maxLength = 1000,
                minLength = 0,
                allowHtml = false,
                required = false,
                pattern = null
            } = rules;

            // 必填检查
            if (required && (!input || input.trim() === '')) {
                result.isValid = false;
                result.errors.push('此字段为必填项');
                return result;
            }

            // 长度检查
            if (input && input.length < minLength) {
                result.isValid = false;
                result.errors.push(`最少需要 ${minLength} 个字符`);
            }

            if (input && input.length > maxLength) {
                result.isValid = false;
                result.errors.push(`最多允许 ${maxLength} 个字符`);
            }

            // HTML检查
            if (!allowHtml && input) {
                const securityResult = securityCheck(input);
                if (!securityResult.safe) {
                    result.isValid = false;
                    result.errors.push('输入包含不安全的HTML内容');
                }
            }

            // 模式检查
            if (pattern && input && !pattern.test(input)) {
                result.isValid = false;
                result.errors.push('输入格式不正确');
            }

            // 清理输入
            if (input && !allowHtml) {
                result.sanitized = escapeHtml(input);
            }

            return result;
        } catch (error) {
            // console.error('输入验证失败:', error);
            result.isValid = false;
            result.errors.push('验证过程中发生错误');
            return result;
        }
    }
}

// 创建全局DOM安全操作实例
const domSafety = DomSafety();

// 导出给模块使用
export { DomSafety, domSafety };
