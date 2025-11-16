/**
 * Security Utility Functions
 * 安全工具函数 - 提供加密、哈希、验证等安全功能
 */

/**
 * 生成安全的随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
export function generateSecureId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    // 使用crypto API生成随机数
    const _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
    if (_crypto && _crypto.getRandomValues) {
        const randomValues = new Uint8Array(length);
        _crypto.getRandomValues(randomValues);

        for (let i = 0; i < length; i++) {
            result += chars[randomValues[i] % chars.length];
        }
    } else {
        // 降级方案
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
    }

    return result;
}

/**
 * 简单的加密函数（使用XOR加密）
 * 注意:这不是生产级的加密方案,仅用于基本的数据混淆
 * @param {string} text - 要加密的文本
 * @param {string} key - 加密密钥
 * @returns {string} 加密后的文本
 */
export async function encrypt(text, key) {
    try {
        // 使用Web Crypto API进行AES加密
        const _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
        if (_crypto && _crypto.subtle) {
            return await encryptAES(text, key);
        } else {
            // 降级到XOR加密
            return xorEncrypt(text, key);
        }
    } catch (error) {
        // console.error('加密失败:', error);
        // 降级到XOR加密
        return xorEncrypt(text, key);
    }
}

/**
 * 简单的解密函数
 * @param {string} encryptedText - 加密的文本
 * @param {string} key - 解密密钥
 * @returns {string} 解密后的文本
 */
export async function decrypt(encryptedText, key) {
    try {
        // 尝试AES解密
        const _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
        if (_crypto && _crypto.subtle) {
            return await decryptAES(encryptedText, key);
        } else {
            // 降级到XOR解密
            return xorDecrypt(encryptedText, key);
        }
    } catch (error) {
        // console.error('解密失败:', error);
        // 降级到XOR解密
        return xorDecrypt(encryptedText, key);
    }
}

/**
 * AES加密（使用Web Crypto API）
 */
async function encryptAES(text, key) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);

    // 生成派生密钥
    const keyMaterial = await _crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const salt = _crypto.getRandomValues(new Uint8Array(16));
    const derivedKey = await _crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['encrypt']
    );

    const iv = _crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await _crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        derivedKey,
        encoder.encode(text)
    );

    // 组合salt、iv和加密数据
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // 转换为base64
    return btoa(String.fromCharCode(...combined));
}

/**
 * AES解密（使用Web Crypto API）
 */
async function decryptAES(encryptedText, key) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);

    // 从base64解码
    const combined = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
    );

    // 分离salt、iv和加密数据
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // 生成派生密钥
    const keyMaterial = await _crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const derivedKey = await _crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: 'AES-GCM',
            length: 256
        },
        false,
        ['decrypt']
    );

    const decrypted = await _crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv
        },
        derivedKey,
        encrypted
    );

    return decoder.decode(decrypted);
}

/**
 * XOR加密（降级方案）
 */
function xorEncrypt(text, key) {
    if (!text || !key) {
        throw new Error('Invalid parameters for xorEncrypt');
    }
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return btoa(result); // 使用base64编码
}

/**
 * XOR解密（降级方案）
 */
function xorDecrypt(encryptedText, key) {
    try {
        const decoded = atob(encryptedText);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch (error) {
        // console.error('XOR解密失败:', error);
        return '';
    }
}

/**
 * 生成数据的哈希值
 * @param {string} data - 要哈希的数据
 * @param {string} algorithm - 哈希算法（默认SHA-256）
 * @returns {Promise<string>} 哈希值
 */
export async function hash(data, algorithm = 'SHA-256') {
    try {
        // 使用Web Crypto API
        const _crypto = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
        if (_crypto && _crypto.subtle) {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await _crypto.subtle.digest(algorithm, dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } else {
            // 降级方案 - 简单的哈希函数
            return simpleHash(data);
        }
    } catch (error) {
        // console.error('哈希生成失败:', error);
        // 降级到简单哈希
        return simpleHash(data);
    }
}

/**
 * 简单的哈希函数（降级方案）
 */
function simpleHash(data) {
    let hash = 0;
    if (data.length === 0) return hash.toString(16);

    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(16);
}

/**
 * 验证数据格式
 * @param {*} data - 要验证的数据
 * @param {string} type - 期望的数据类型
 * @param {Object} options - 验证选项
 * @returns {Object} 验证结果
 */
export function validateData(data, type, options = {}) {
    const result = {
        valid: false,
        error: null,
        sanitized: null
    };

    try {
        switch (type) {
        case 'string':
            result.valid = typeof data === 'string';
            if (!result.valid) {
                result.error = '数据必须是字符串类型';
            } else {
                result.sanitized = sanitizeString(data, options);
            }
            break;

        case 'number':
            result.valid = typeof data === 'number' && !isNaN(data);
            if (!result.valid) {
                result.error = '数据必须是有效的数字';
            } else {
                result.sanitized = Number(data);
            }
            break;

        case 'boolean':
            result.valid = typeof data === 'boolean';
            if (!result.valid) {
                result.error = '数据必须是布尔值';
            } else {
                result.sanitized = Boolean(data);
            }
            break;

        case 'array':
            result.valid = Array.isArray(data);
            if (!result.valid) {
                result.error = '数据必须是数组';
            } else {
                result.sanitized = data.map(item =>
                    options.itemType ? validateData(item, options.itemType, options.itemOptions).sanitized : item
                );
            }
            break;

        case 'object':
            result.valid = typeof data === 'object' && data !== null && !Array.isArray(data);
            if (!result.valid) {
                result.error = '数据必须是对象';
            } else {
                result.sanitized = sanitizeObject(data, options);
            }
            break;

        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            result.valid = emailRegex.test(data);
            if (!result.valid) {
                result.error = '无效的邮箱地址格式';
            } else {
                result.sanitized = data.toLowerCase().trim();
            }
            break;

        case 'url':
            try {
                new URL(data);
                result.valid = true;
                result.sanitized = data.trim();
            } catch {
                result.valid = false;
                result.error = '无效的URL格式';
            }
            break;

        default:
            result.valid = true;
            result.sanitized = data;
        }
    } catch (error) {
        result.error = `验证失败: ${error.message}`;
    }

    return result;
}

/**
 * 清理字符串
 */
function sanitizeString(str, options = {}) {
    let sanitized = str;

    if (options.trim !== false) {
        sanitized = sanitized.trim();
    }

    if (options.lowercase) {
        sanitized = sanitized.toLowerCase();
    }

    if (options.uppercase) {
        sanitized = sanitized.toUpperCase();
    }

    if (options.removeSpecialChars) {
        sanitized = sanitized.replace(/[^\w\s]/gi, '');
    }

    if (options.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
    }

    if (options.escapeHtml) {
        sanitized = escapeHtml(sanitized);
    }

    return sanitized;
}

/**
 * 清理对象
 */
function sanitizeObject(obj, options = {}) {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        // 清理键名
        const sanitizedKey = options.sanitizeKeys ? sanitizeString(key, { removeSpecialChars: true }) : key;

        // 清理值
        if (options.properties && options.properties[key]) {
            const propOptions = options.properties[key];
            if (propOptions.type) {
                const validation = validateData(value, propOptions.type, propOptions);
                sanitized[sanitizedKey] = validation.sanitized;
            } else {
                sanitized[sanitizedKey] = value;
            }
        } else {
            sanitized[sanitizedKey] = value;
        }
    }

    return sanitized;
}

/**
 * HTML转义
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#039;'
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {Array<string>} allowedTypes - 允许的文件类型
 * @param {number} maxSize - 最大文件大小（字节）
 * @returns {Object} 验证结果
 */
export function validateFile(file, allowedTypes = [], maxSize = 0) {
    const result = {
        valid: false,
        error: null
    };

    try {
        // 检查文件类型
        if (allowedTypes.length > 0) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const mimeType = file.type;

            const typeValid = allowedTypes.some(type => {
                if (type.startsWith('.')) {
                    // 文件扩展名检查
                    return fileExtension === type.slice(1);
                } else if (type.includes('/')) {
                    // MIME类型检查
                    return mimeType === type || mimeType.startsWith(type.replace('*', ''));
                }
                return false;
            });

            if (!typeValid) {
                result.error = `不支持的文件类型.允许的类型: ${allowedTypes.join(', ')}`;
                return result;
            }
        }

        // 检查文件大小
        if (maxSize > 0 && file.size > maxSize) {
            result.error = `文件太大.最大允许大小: ${formatFileSize(maxSize)}`;
            return result;
        }

        result.valid = true;
    } catch (error) {
        result.error = `文件验证失败: ${error.message}`;
    }

    return result;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 创建内容安全策略头
 * @param {Object} options - CSP选项
 * @returns {string} CSP头值
 */
export function createCSPHeader(options = {}) {
    const defaults = {
        'default-src': ['\'self\''],
        'script-src': ['\'self\'', '\'unsafe-inline\''],
        'style-src': ['\'self\'', '\'unsafe-inline\''],
        'img-src': ['\'self\'', 'data:', 'https:'],
        'font-src': ['\'self\'', 'data:'],
        'connect-src': ['\'self\''],
        'frame-src': ['\'none\''],
        'object-src': ['\'none\''],
        'base-uri': ['\'self\''],
        'form-action': ['\'self\'']
    };

    const csp = { ...defaults, ...options };

    return Object.entries(csp)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');
}

/**
 * 安全检查 - 防止XSS攻击
 * @param {string} input - 用户输入
 * @returns {Object} 检查结果
 */
export function securityCheck(input) {
    const issues = [];

    // 检查潜在的XSS模式
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>.*?<\/embed>/gi,
        /data:text\/html/gi
    ];

    xssPatterns.forEach(pattern => {
        if (pattern.test(input)) {
            issues.push({
                type: 'xss',
                severity: 'high',
                pattern: pattern.toString()
            });
        }
    });

    // 检查SQL注入模式
    const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|and|or|order by|group by)\b)/gi,
        /('|")\s*(or|and)\s*('|")?\s*(=|>|<|>=|<=|!=)/gi,
        /(\b(or|and)\s+\d+\s*=\s*\d+\b)/gi
    ];

    sqlPatterns.forEach(pattern => {
        if (pattern.test(input)) {
            issues.push({
                type: 'sql_injection',
                severity: 'high',
                pattern: pattern.toString()
            });
        }
    });

    return {
        safe: issues.length === 0,
        issues,
        sanitized: escapeHtml(input)
    };
}
