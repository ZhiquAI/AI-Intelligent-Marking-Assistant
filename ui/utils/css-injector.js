/**
 * CSS Injector - 统一管理样式注入
 * 提供安全的CSS样式注入、缓存和管理功能
 */

class CSSInjector {
    constructor() {
        this.injectedStyles = new Map();
        this.styleQueue = [];
        this.isProcessing = false;
        this.defaultOptions = {
            media: 'all',
            charset: 'utf-8',
            crossorigin: 'anonymous'
        };
    }

    /**
     * 注入CSS样式
     * @param {string} cssPath - CSS文件相对路径
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否成功注入
     */
    async inject(cssPath, options = {}) {
        if (typeof cssPath !== 'string') {
            console.error('CSS路径必须是字符串:', cssPath);
            return false;
        }

        // 检查是否已注入
        if (this.injectedStyles.has(cssPath)) {
            if (this.debugMode) {
                console.log(`CSS已存在: ${cssPath}`);
            }
            return true;
        }

        const config = { ...this.defaultOptions, ...options };

        try {
            // 构建完整的样式路径
            const fullUrl = this.buildUrl(cssPath, config.basePath);
            const styleElement = await this.createStyleElement(fullUrl, config);

            // 注入到DOM
            const success = await this.injectToDOM(styleElement);

            if (success) {
                this.injectedStyles.set(cssPath, {
                    element: styleElement,
                    url: fullUrl,
                    timestamp: Date.now(),
                    options: config
                });

                if (this.debugMode) {
                    console.log(`CSS注入成功: ${cssPath}`, { url: fullUrl });
                }
            }

            return success;
        } catch (error) {
            console.error(`CSS注入失败: ${cssPath}`, error);
            return false;
        }
    }

    /**
     * 批量注入CSS
     * @param {string[]} cssPaths - CSS文件路径数组
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 注入结果
     */
    async injectBatch(cssPaths, options = {}) {
        const results = {
            success: [],
            failed: [],
            total: cssPaths.length
        };

        for (const cssPath of cssPaths) {
            try {
                const success = await this.inject(cssPath, options);
                if (success) {
                    results.success.push(cssPath);
                } else {
                    results.failed.push(cssPath);
                }
            } catch (error) {
                results.failed.push(cssPath);
                console.error(`批量注入失败: ${cssPath}`, error);
            }
        }

        return results;
    }

    /**
     * 移除已注入的CSS
     * @param {string} cssPath - CSS文件路径
     * @returns {boolean} 是否成功移除
     */
    remove(cssPath) {
        const styleData = this.injectedStyles.get(cssPath);
        if (!styleData) {
            return false;
        }

        try {
            if (styleData.element && styleData.element.parentNode) {
                styleData.element.parentNode.removeChild(styleData.element);
            }
            this.injectedStyles.delete(cssPath);

            if (this.debugMode) {
                console.log(`CSS移除成功: ${cssPath}`);
            }
            return true;
        } catch (error) {
            console.error(`CSS移除失败: ${cssPath}`, error);
            return false;
        }
    }

    /**
     * 清除所有注入的CSS
     */
    clear() {
        const cssPaths = Array.from(this.injectedStyles.keys());
        const results = { success: 0, failed: 0 };

        cssPaths.forEach(cssPath => {
            if (this.remove(cssPath)) {
                results.success++;
            } else {
                results.failed++;
            }
        });

        if (this.debugMode) {
            console.log('清除所有CSS:', results);
        }
    }

    /**
     * 检查CSS是否已注入
     * @param {string} cssPath - CSS文件路径
     * @returns {boolean} 是否已注入
     */
    isInjected(cssPath) {
        return this.injectedStyles.has(cssPath);
    }

    /**
     * 获取注入的CSS信息
     * @param {string} cssPath - CSS文件路径（可选）
     * @returns {Object} CSS信息
     */
    getInjectedInfo(cssPath = null) {
        if (cssPath) {
            return this.injectedStyles.get(cssPath) || null;
        } else {
            // 返回所有CSS信息
            const info = {};
            for (const [path, data] of this.injectedStyles.entries()) {
                info[path] = {
                    url: data.url,
                    timestamp: data.timestamp,
                    options: data.options
                };
            }
            return info;
        }
    }

    /**
     * 重新加载CSS
     * @param {string} cssPath - CSS文件路径
     * @returns {boolean} 是否成功重载
     */
    async reload(cssPath) {
        if (this.remove(cssPath)) {
            return await this.inject(cssPath);
        }
        return false;
    }

    /**
     * 创建样式元素
     * @param {string} url - CSS文件URL
     * @param {Object} options - 选项
     * @returns {Promise<HTMLLinkElement|HTMLStyleElement>} 样式元素
     */
    async createStyleElement(url, options) {
        return new Promise((resolve, reject) => {
            // 创建link元素
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;

            // 设置属性
            Object.keys(options).forEach(key => {
                if (key !== 'content') {
                    link.setAttribute(key, options[key]);
                }
            });

            // 设置数据属性
            link.setAttribute('data-zhixue-css-injector', 'true');
            link.setAttribute('data-css-path', url);

            // 处理加载事件
            link.onload = () => {
                resolve(link);
            };

            link.onerror = () => {
                reject(new Error(`CSS文件加载失败: ${url}`));
            };

            // 设置超时
            const timeout = options.timeout || 10000;
            setTimeout(() => {
                reject(new Error(`CSS文件加载超时: ${url}`));
            }, timeout);
        });
    }

    /**
     * 注入样式元素到DOM
     * @param {HTMLLinkElement|HTMLStyleElement} styleElement - 样式元素
     * @returns {Promise<boolean>} 是否成功注入
     */
    async injectToDOM(styleElement) {
        return new Promise((resolve) => {
            // 等待DOM就绪
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.performInjection(styleElement, resolve);
                });
            } else {
                this.performInjection(styleElement, resolve);
            }
        });
    }

    /**
     * 执行实际的注入操作
     * @param {HTMLLinkElement|HTMLStyleElement} styleElement - 样式元素
     * @param {Function} resolve - 解析函数
     */
    performInjection(styleElement, resolve) {
        try {
            document.head.appendChild(styleElement);
            resolve(true);
        } catch (error) {
            console.error('CSS注入到DOM失败:', error);
            resolve(false);
        }
    }

    /**
     * 构建完整的URL
     * @param {string} cssPath - CSS文件路径
     * @param {string} basePath - 基础路径
     * @returns {string} 完整URL
     */
    buildUrl(cssPath, basePath = null) {
        // 如果是完整URL，直接返回
        if (cssPath.startsWith('http://') || cssPath.startsWith('https://') || cssPath.startsWith('data:')) {
            return cssPath;
        }

        // 使用Chrome扩展URL
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            const baseUrl = basePath || 'ui/styles/';
            return chrome.runtime.getURL(baseUrl + cssPath);
        }

        // 相对路径
        const base = basePath || 'ui/styles/';
        return base + cssPath;
    }

    /**
     * 从文本创建样式
     * @param {string} cssText - CSS文本内容
     * @param {string} id - 样式ID（可选）
     * @param {Object} options - 选项
     * @returns {Promise<boolean>} 是否成功创建
     */
    async createStyleFromText(cssText, id = null, options = {}) {
        try {
            const style = document.createElement('style');

            if (id) {
                style.id = id;
            }

            // 设置样式内容
            style.textContent = cssText;

            // 设置属性
            Object.keys(options).forEach(key => {
                if (key !== 'content') {
                    style.setAttribute(key, options[key]);
                }
            });

            // 设置数据属性
            style.setAttribute('data-zhixue-css-injector', 'true');
            style.setAttribute('data-css-type', 'text');

            // 注入到DOM
            const success = await this.injectToDOM(style);

            if (success) {
                const cssPath = id || 'dynamic-' + Date.now();
                this.injectedStyles.set(cssPath, {
                    element: style,
                    type: 'text',
                    timestamp: Date.now(),
                    options
                });
            }

            return success;
        } catch (error) {
            console.error('从文本创建样式失败:', error);
            return false;
        }
    }

    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
    }

    /**
     * 设置默认选项
     * @param {Object} options - 默认选项
     */
    setDefaultOptions(options) {
        this.defaultOptions = { ...this.defaultOptions, ...options };
    }

    /**
     * 获取注入统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalInjected: this.injectedStyles.size,
            injectedStyles: Array.from(this.injectedStyles.keys()),
            debugMode: this.debugMode,
            lastInjected: this.getLastInjectedTime()
        };
    }

    /**
     * 获取最后注入时间
     * @returns {number|null} 最后注入时间戳
     */
    getLastInjectedTime() {
        let lastTime = null;
        for (const [, data] of this.injectedStyles.entries()) {
            if (!lastTime || data.timestamp > lastTime) {
                lastTime = data.timestamp;
            }
        }
        return lastTime;
    }
}

// 创建全局CSS注入器实例
const cssInjector = new CSSInjector();

// 导出便捷函数
export const injectStyles = (cssPath, options) => cssInjector.inject(cssPath, options);
export const injectBatch = (cssPaths, options) => cssInjector.injectBatch(cssPaths, options);
export const removeStyle = (cssPath) => cssInjector.remove(cssPath);
export const clearStyles = () => cssInjector.clear();
export const isStyleInjected = (cssPath) => cssInjector.isInjected(cssPath);
export const createStyleFromText = (cssText, id, options) => cssInjector.createStyleFromText(cssText, id, options);

// 兼容性导出函数
export function ensureStyles(paths = []) {
    console.warn('ensureStyles已弃用，请使用injectBatch');
    return injectBatch(paths);
}

// 导出类和实例
export default cssInjector;
export { CSSInjector };