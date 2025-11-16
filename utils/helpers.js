// ============================================================================
// 智学网AI阅卷助手 - 辅助函数库
// 100%还原原HTML中的工具函数
// ============================================================================

export class Helpers {

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @param {boolean} immediate - 是否立即执行
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait, immediate = false) {
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
     * @param {number} limit - 时间间隔（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 深拷贝对象
     * @param {any} obj - 要拷贝的对象
     * @returns {any} 拷贝后的对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (typeof obj === 'object') {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }

        return obj;
    }

    /**
     * 生成唯一ID
     * @param {string} prefix - 前缀
     * @returns {string} 唯一ID
     */
    generateId(prefix = 'id') {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 9);
        return `${prefix}_${timestamp}_${randomPart}`;
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @param {number} decimals - 小数位数
     * @returns {string} 格式化后的文件大小
     */
    formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    /**
     * 格式化百分比
     * @param {number} value - 值（0-1之间）
     * @param {number} decimals - 小数位数
     * @returns {string} 格式化后的百分比
     */
    formatPercentage(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
    }

    /**
     * 格式化数字
     * @param {number} num - 数字
     * @param {number} decimals - 小数位数
     * @returns {string} 格式化后的数字
     */
    formatNumber(num, decimals = 2) {
        return Number(num).toFixed(decimals);
    }

    /**
     * 截取文本
     * @param {string} text - 文本
     * @param {number} maxLength - 最大长度
     * @param {string} suffix - 后缀
     * @returns {string} 截取后的文本
     */
    truncateText(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * 首字母大写
     * @param {string} str - 字符串
     * @returns {string} 首字母大写的字符串
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * 驼峰命名转短横线
     * @param {string} str - 驼峰命名字符串
     * @returns {string} 短横线字符串
     */
    camelToKebab(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * 短横线转驼峰命名
     * @param {string} str - 短横线字符串
     * @returns {string} 驼峰命名字符串
     */
    kebabToCamel(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * 等待指定时间
     * @param {number} ms - 毫秒数
     * @returns {Promise} Promise对象
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重试函数
     * @param {Function} fn - 要重试的函数
     * @param {number} retries - 重试次数
     * @param {number} delay - 延迟时间（毫秒）
     * @returns {Promise} 执行结果
     */
    async retry(fn, retries = 3, delay = 1000) {
        let lastError;
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < retries) {
                    await this.sleep(delay);
                }
            }
        }
        throw lastError;
    }

    /**
     * 并行执行多个Promise
     * @param {Array} promises - Promise数组
     * @param {number} limit - 并发限制
     * @returns {Promise} 执行结果
     */
    async pMap(promises, limit = 5) {
        const results = [];
        const executing = [];

        for (const promise of promises) {
            const result = promise.then(val => {
                executing.splice(executing.indexOf(promise), 1);
                return val;
            });

            results.push(result);
            executing.push(result);

            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }

    /**
     * 获取对象属性值
     * @param {Object} obj - 对象
     * @param {string} path - 属性路径
     * @param {any} defaultValue - 默认值
     * @returns {any} 属性值
     */
    get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result === null || result === undefined || !Object.prototype.hasOwnProperty.call(result, key)) {
                return defaultValue;
            }
            result = result[key];
        }

        return result;
    }

    /**
     * 设置对象属性值
     * @param {Object} obj - 对象
     * @param {string} path - 属性路径
     * @param {any} value - 值
     */
    set(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;

        for (const key of keys) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
    }

    /**
     * 检查是否为空
     * @param {any} value - 值
     * @returns {boolean} 是否为空
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    /**
     * 检查是否为数字
     * @param {any} value - 值
     * @returns {boolean} 是否为数字
     */
    isNumber(value) {
        return !isNaN(value) && isFinite(value);
    }

    /**
     * 检查是否为有效邮箱
     * @param {string} email - 邮箱
     * @returns {boolean} 是否为有效邮箱
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * 数组去重
     * @param {Array} arr - 数组
     * @param {string} key - 去重依据的键
     * @returns {Array} 去重后的数组
     */
    unique(arr, key) {
        if (!key) {
            return [...new Set(arr)];
        }

        const seen = Set();
        return arr.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    /**
     * 数组分组
     * @param {Array} arr - 数组
     * @param {number} size - 每组大小
     * @returns {Array} 分组后的数组
     */
    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * 数组洗牌
     * @param {Array} arr - 数组
     * @returns {Array} 洗牌后的数组
     */
    shuffle(arr) {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    /**
     * 数组求和
     * @param {Array} arr - 数字数组
     * @returns {number} 总和
     */
    sum(arr) {
        return arr.reduce((acc, curr) => acc + curr, 0);
    }

    /**
     * 数组平均值
     * @param {Array} arr - 数字数组
     * @returns {number} 平均值
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return this.sum(arr) / arr.length;
    }

    /**
     * 获取查询参数
     * @param {string} url - URL（可选,默认使用当前URL）
     * @returns {Object} 查询参数对象
     */
    getQueryParams(url = window.location.href) {
        const params = {};
        const queryString = url.split('?')[1];
        if (!queryString) return params;

        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });

        return params;
    }

    /**
     * 设置查询参数
     * @param {string} key - 参数名
     * @param {string} value - 参数值
     */
    setQueryParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }

    /**
     * 复制到剪贴板
     * @param {string} text - 文本
     * @returns {Promise<boolean>} 是否成功
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // console.error('❌ 复制失败:', error);
            return false;
        }
    }

    /**
     * 下载文本文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    downloadTextFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * 下载JSON文件
     * @param {Object} data - JSON数据
     * @param {string} filename - 文件名
     */
    downloadJSON(data, filename) {
        this.downloadTextFile(JSON.stringify(data, null, 2), filename, 'application/json');
    }

    /**
     * 格式化时间
     * @param {Date|number} date - 时间
     * @param {string} format - 格式
     * @returns {string} 格式化后的时间
     */
    formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
}

// 创建全局实例
export const helpers = Helpers();
