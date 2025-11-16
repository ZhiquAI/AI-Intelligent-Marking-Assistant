/**
 * DOM Sanitizer - DOM净化工具
 * 提供安全的DOM操作和XSS防护功能
 */

/**
 * DOM净化器类
 */
export class DOMSanitizer {
    constructor(options = {}) {
        this.options = {
            // 允许的HTML标签
            allowedTags: [
                'a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio',
                'b', 'bdi', 'bdo', 'big', 'blockquote', 'body', 'br', 'button', 'canvas',
                'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd',
                'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed',
                'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
                'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe',
                'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main',
                'map', 'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol',
                'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress',
                'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select',
                'small', 'source', 'span', 'strike', 'strong', 'style', 'sub', 'summary',
                'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th',
                'thead', 'time', 'title', 'tr', 'track', 'tt', 'u', 'ul', 'var',
                'video', 'wbr'
            ],

            // 危险的标签（完全移除）
            forbiddenTags: [
                'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
                'button', 'select', 'option', 'link', 'meta', 'style'
            ],

            // 允许的属性
            allowedAttributes: {
                global: ['id', 'class', 'title', 'lang', 'dir', 'data-*'],
                a: ['href', 'target', 'rel', 'download'],
                img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
                video: ['src', 'controls', 'width', 'height', 'poster', 'preload'],
                audio: ['src', 'controls', 'preload'],
                iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
                source: ['src', 'type'],
                track: ['src', 'kind', 'srclang', 'label', 'default'],
                table: ['border', 'cellpadding', 'cellspacing'],
                td: ['colspan', 'rowspan', 'headers'],
                th: ['colspan', 'rowspan', 'headers', 'scope'],
                time: ['datetime'],
                data: ['value']
            },

            // 危险的属性
            forbiddenAttributes: [
                'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
                'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
                'onkeydown', 'onkeyup', 'onkeypress', 'onmousedown',
                'onmouseup', 'onmousemove', 'ondblclick'
            ],

            // 允许的协议
            allowedProtocols: [
                'http:', 'https:', 'mailto:', 'tel:', 'ftp:', 'data:',
                'chrome-extension:', 'moz-extension:', 'ms-browser-extension:'
            ],

            // 是否允许data URL
            allowDataUrls: true,

            // 是否允许相对URL
            allowRelativeUrls: true,

            // 是否保留空白字符
            preserveWhitespace: false,

            // 是否在净化后记录日志
            logViolations: true,

            ...options
        };

        this.violations = [];
        this.stats = {
            totalElements: 0,
            removedElements: 0,
            removedAttributes: 0,
            sanitizedUrls: 0
        };
    }

    /**
     * 净化HTML字符串
     */
    sanitize(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        // 重置统计信息
        this.stats = {
            totalElements: 0,
            removedElements: 0,
            removedAttributes: 0,
            sanitizedUrls: 0
        };

        try {
            // 创建DOM解析器
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // 检查解析错误
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                this.logViolation('HTML_PARSE_ERROR', 'HTML解析失败', { html: html.substring(0, 100) });
                return '';
            }

            // 递归净化DOM
            this.sanitizeNode(doc.body);

            // 获取净化后的HTML
            const sanitizedHTML = this.getInnerHTML(doc.body);

            // 记录统计信息
            if (this.options.logViolations && this.hasViolations()) {
                console.warn('DOM Sanitization violations:', this.getViolations());
            }

            return sanitizedHTML;
        } catch (error) {
            this.logViolation('SANITIZATION_ERROR', error.message, { html: html.substring(0, 100) });
            return '';
        }
    }

    /**
     * 净化DOM节点
     */
    sanitizeNode(node) {
        if (!node) return;

        switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                this.sanitizeElement(node);
                break;

            case Node.TEXT_NODE:
                // 文本节点通常是安全的，但需要检查是否包含危险内容
                this.sanitizeTextNode(node);
                break;

            case Node.COMMENT_NODE:
                // 移除注释节点（可能包含敏感信息）
                this.removeNode(node);
                break;

            case Node.CDATA_SECTION_NODE:
                // 移除CDATA节点
                this.removeNode(node);
                break;
        }

        // 递归处理子节点
        const children = Array.from(node.childNodes);
        children.forEach(child => this.sanitizeNode(child));
    }

    /**
     * 净化元素节点
     */
    sanitizeElement(element) {
        if (!element.tagName) return;

        this.stats.totalElements++;

        const tagName = element.tagName.toLowerCase();

        // 检查是否为禁止的标签
        if (this.isForbiddenTag(tagName)) {
            this.logViolation('FORBIDDEN_TAG', `禁止的标签: ${tagName}`, { element });
            this.removeNode(element);
            this.stats.removedElements++;
            return;
        }

        // 检查是否为允许的标签
        if (!this.isAllowedTag(tagName)) {
            this.logViolation('UNKNOWN_TAG', `未知标签: ${tagName}`, { element });
            // 保留内容，移除标签
            this.replaceWithContent(element);
            this.stats.removedElements++;
            return;
        }

        // 净化属性
        this.sanitizeAttributes(element);

        // 特殊标签处理
        this.handleSpecialTags(element);
    }

    /**
     * 净化属性
     */
    sanitizeAttributes(element) {
        const attributes = Array.from(element.attributes);
        const tagName = element.tagName.toLowerCase();

        attributes.forEach(attr => {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.value;

            // 检查是否为禁止的属性
            if (this.isForbiddenAttribute(attrName)) {
                this.logViolation('FORBIDDEN_ATTRIBUTE', `禁止的属性: ${attrName}`, { element, attribute: attrName });
                element.removeAttribute(attrName);
                this.stats.removedAttributes++;
                return;
            }

            // 检查是否为允许的属性
            if (!this.isAllowedAttribute(tagName, attrName)) {
                this.logViolation('UNKNOWN_ATTRIBUTE', `未知属性: ${attrName}`, { element, attribute: attrName });
                element.removeAttribute(attrName);
                this.stats.removedAttributes++;
                return;
            }

            // 净化属性值
            const sanitizedValue = this.sanitizeAttributeValue(attrName, attrValue);
            if (sanitizedValue !== attrValue) {
                if (sanitizedValue) {
                    element.setAttribute(attrName, sanitizedValue);
                } else {
                    element.removeAttribute(attrName);
                    this.stats.removedAttributes++;
                }
            }
        });
    }

    /**
     * 净化属性值
     */
    sanitizeAttributeValue(attrName, attrValue) {
        if (!attrValue || typeof attrValue !== 'string') {
            return '';
        }

        // URL属性特殊处理
        const urlAttributes = ['href', 'src', 'action', 'formaction', 'background', 'cite'];
        if (urlAttributes.includes(attrName.toLowerCase())) {
            return this.sanitizeUrl(attrValue);
        }

        // 移除潜在的JavaScript代码
        const jsPatterns = [
            /javascript:/gi,
            /vbscript:/gi,
            /data:(?!image\/)/gi,
            /<script/gi,
            /on\w+\s*=/gi
        ];

        let sanitizedValue = attrValue;
        jsPatterns.forEach(pattern => {
            if (pattern.test(sanitizedValue)) {
                this.logViolation('DANGEROUS_ATTRIBUTE_VALUE', `危险的属性值: ${attrName}=${attrValue}`, { pattern: pattern.source });
                sanitizedValue = sanitizedValue.replace(pattern, '');
            }
        });

        // 移除HTML实体编码的危险字符
        sanitizedValue = this.decodeHtmlEntities(sanitizedValue);

        return sanitizedValue.trim();
    }

    /**
     * 净化URL
     */
    sanitizeUrl(url) {
        if (!url || typeof url !== 'string') {
            return '';
        }

        try {
            // 解码HTML实体
            const decodedUrl = this.decodeHtmlEntities(url.trim());

            // 处理data URL
            if (decodedUrl.startsWith('data:')) {
                if (!this.options.allowDataUrls) {
                    this.logViolation('DATA_URL_BLOCKED', `阻止data URL: ${decodedUrl.substring(0, 50)}`);
                    return '';
                }

                // 验证data URL格式
                const dataUrlMatch = decodedUrl.match(/^data:(image\/[a-z]+);base64,/i);
                if (!dataUrlMatch) {
                    this.logViolation('INVALID_DATA_URL', `无效的data URL: ${decodedUrl.substring(0, 50)}`);
                    return '';
                }

                return decodedUrl;
            }

            // 处理相对URL
            if (this.options.allowRelativeUrls && !decodedUrl.includes('://')) {
                return decodedUrl;
            }

            // 创建URL对象验证格式
            const urlObj = new URL(decodedUrl, window.location.href);
            const protocol = urlObj.protocol.toLowerCase();

            // 检查协议
            if (!this.options.allowedProtocols.includes(protocol)) {
                this.logViolation('INVALID_PROTOCOL', `不允许的协议: ${protocol}`, { url: decodedUrl });
                return '';
            }

            this.stats.sanitizedUrls++;
            return urlObj.toString();
        } catch (error) {
            this.logViolation('INVALID_URL', `无效的URL: ${url}`, { error: error.message });
            return '';
        }
    }

    /**
     * 净化文本节点
     */
    sanitizeTextNode(textNode) {
        const text = textNode.textContent || '';

        // 检查是否包含潜在的脚本代码
        const dangerousPatterns = [
            /<script/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /on\w+\s*=/gi
        ];

        const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(text));
        if (hasDangerousContent) {
            this.logViolation('DANGEROUS_TEXT_CONTENT', '文本节点包含危险内容', { text: text.substring(0, 100) });
            // 移除危险内容
            textNode.textContent = text.replace(/<script[^>]*>.*?<\/script>/gi, '')
                                     .replace(/javascript:/gi, '')
                                     .replace(/vbscript:/gi, '')
                                     .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        }
    }

    /**
     * 处理特殊标签
     */
    handleSpecialTags(element) {
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'a':
                this.handleLinkElement(element);
                break;

            case 'img':
                this.handleImageElement(element);
                break;

            case 'iframe':
                this.handleIframeElement(element);
                break;

            case 'script':
                // 脚本标签应该在前面被移除，但这里做双重检查
                this.removeNode(element);
                break;
        }
    }

    /**
     * 处理链接元素
     */
    handleLinkElement(element) {
        const href = element.getAttribute('href');
        if (href) {
            // 添加安全属性
            element.setAttribute('rel', 'noopener noreferrer');

            // 如果是外部链接，添加target="_blank"
            if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                element.setAttribute('target', '_blank');
            }
        }
    }

    /**
     * 处理图片元素
     */
    handleImageElement(element) {
        const src = element.getAttribute('src');
        if (src) {
            // 验证图片URL
            const sanitizedSrc = this.sanitizeUrl(src);
            if (!sanitizedSrc) {
                this.removeNode(element);
                return;
            }

            element.setAttribute('src', sanitizedSrc);
        }

        // 添加alt属性（如果没有）
        if (!element.getAttribute('alt')) {
            element.setAttribute('alt', '');
        }
    }

    /**
     * 处理iframe元素
     */
    handleIframeElement(element) {
        const src = element.getAttribute('src');
        if (src) {
            // 严格限制iframe的src
            const sanitizedSrc = this.sanitizeUrl(src);
            if (!sanitizedSrc || !sanitizedSrc.startsWith('https://')) {
                this.logViolation('IFRAME_SRC_BLOCKED', `阻止iframe加载: ${src}`);
                this.removeNode(element);
                return;
            }

            element.setAttribute('src', sanitizedSrc);
        }

        // 添加安全属性
        element.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        element.setAttribute('loading', 'lazy');
    }

    /**
     * 检查是否为禁止的标签
     */
    isForbiddenTag(tagName) {
        return this.options.forbiddenTags.includes(tagName);
    }

    /**
     * 检查是否为允许的标签
     */
    isAllowedTag(tagName) {
        return this.options.allowedTags.includes(tagName);
    }

    /**
     * 检查是否为禁止的属性
     */
    isForbiddenAttribute(attrName) {
        return this.options.forbiddenAttributes.some(forbidden => {
            if (forbidden.endsWith('*')) {
                return attrName.startsWith(forbidden.slice(0, -1));
            }
            return attrName === forbidden;
        });
    }

    /**
     * 检查是否为允许的属性
     */
    isAllowedAttribute(tagName, attrName) {
        // 检查全局属性
        if (this.isAttributeAllowed('global', attrName)) {
            return true;
        }

        // 检查特定标签的属性
        return this.isAttributeAllowed(tagName, attrName);
    }

    /**
     * 检查属性是否被允许
     */
    isAttributeAllowed(element, attrName) {
        const allowedAttrs = this.options.allowedAttributes[element];
        if (!allowedAttrs) return false;

        return allowedAttrs.some(allowed => {
            if (allowed.endsWith('*')) {
                return attrName.startsWith(allowed.slice(0, -1));
            }
            return attrName === allowed;
        });
    }

    /**
     * 解码HTML实体
     */
    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    /**
     * 移除节点
     */
    removeNode(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    /**
     * 用内容替换节点
     */
    replaceWithContent(node) {
        const fragment = document.createDocumentFragment();
        while (node.firstChild) {
            fragment.appendChild(node.firstChild);
        }

        if (node.parentNode) {
            node.parentNode.replaceChild(fragment, node);
        }
    }

    /**
     * 获取内部HTML（保留文本内容）
     */
    getInnerHTML(element) {
        if (!this.options.preserveWhitespace) {
            // 创建临时元素以清理空白字符
            const temp = document.createElement('div');
            temp.appendChild(element.cloneNode(true));
            return temp.innerHTML.trim();
        }
        return element.innerHTML;
    }

    /**
     * 记录违规
     */
    logViolation(type, message, data = {}) {
        const violation = {
            timestamp: Date.now(),
            type,
            message,
            data
        };

        this.violations.push(violation);

        // 限制违规记录数量
        if (this.violations.length > 100) {
            this.violations.shift();
        }
    }

    /**
     * 获取违规记录
     */
    getViolations() {
        return [...this.violations];
    }

    /**
     * 检查是否有违规
     */
    hasViolations() {
        return this.violations.length > 0;
    }

    /**
     * 清除违规记录
     */
    clearViolations() {
        this.violations = [];
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalElements: 0,
            removedElements: 0,
            removedAttributes: 0,
            sanitizedUrls: 0
        };
    }
}

// 创建默认的DOM净化器实例
export const defaultSanitizer = new DOMSanitizer();

// 导出便捷函数
export function sanitizeHTML(html, options) {
    if (options) {
        const sanitizer = new DOMSanitizer(options);
        return sanitizer.sanitize(html);
    }
    return defaultSanitizer.sanitize(html);
}

export function sanitizeElement(element, options) {
    if (options) {
        const sanitizer = new DOMSanitizer(options);
        sanitizer.sanitizeNode(element);
        return sanitizer.getStats();
    }

    defaultSanitizer.sanitizeNode(element);
    return defaultSanitizer.getStats();
}

export function setDefaultSanitizerOptions(options) {
    Object.assign(defaultSanitizer.options, options);
}

export function getSanitizationStats() {
    return defaultSanitizer.getStats();
}

export function getSanitizationViolations() {
    return defaultSanitizer.getViolations();
}

export function clearSanitizationViolations() {
    return defaultSanitizer.clearViolations();
}

// 默认导出
export default {
    DOMSanitizer,
    defaultSanitizer,
    sanitizeHTML,
    sanitizeElement,
    setDefaultSanitizerOptions,
    getSanitizationStats,
    getSanitizationViolations,
    clearSanitizationViolations
};