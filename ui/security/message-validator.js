/**
 * Message Validator - 消息验证系统
 * 提供安全、可验证的消息传递机制，防止恶意消息攻击
 */

import { hash, generateSecureId } from '../../utils/security-utils.js';

/**
 * 消息验证器类
 */
export class MessageValidator {
    constructor(options = {}) {
        this.options = {
            // 消息过期时间（毫秒）
            messageExpiration: 5 * 60 * 1000, // 5分钟

            // 最大消息大小
            maxMessageSize: 1024 * 1024, // 1MB

            // 是否启用消息签名
            enableSigning: true,

            // 是否启用消息加密
            enableEncryption: true,

            // 是否启用消息重放攻击防护
            enableReplayProtection: true,

            // 允许的发送者
            allowedSenders: [
                'background-script',
                'content-script',
                'popup',
                'options-page'
            ],

            // 支持的消息类型
            allowedMessageTypes: [
                'ai_request',
                'ai_response',
                'config_update',
                'config_request',
                'storage_get',
                'storage_set',
                'tab_action',
                'ui_event',
                'error_report',
                'debug_info'
            ],

            ...options
        };

        // 用于重放攻击防护的消息ID缓存
        this.messageCache = new Map();
        this.signingKey = null;

        this.init();
    }

    /**
     * 初始化消息验证器
     */
    async init() {
        try {
            // 生成签名密钥
            if (this.options.enableSigning) {
                this.signingKey = await this.generateSigningKey();
            }

            // 定期清理消息缓存
            setInterval(() => {
                this.cleanupMessageCache();
            }, 60000); // 每分钟清理一次

        } catch (error) {
            console.error('消息验证器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 验证消息
     * @param {Object} message - 要验证的消息
     * @param {Object} options - 验证选项
     */
    async validateMessage(message, options = {}) {
        const validationResult = {
            isValid: false,
            reason: null,
            sanitizedMessage: null,
            risks: []
        };

        try {
            // 基础结构检查
            const structureCheck = this.validateMessageStructure(message);
            if (!structureCheck.valid) {
                validationResult.reason = structureCheck.reason;
                return validationResult;
            }

            // 消息大小检查
            const sizeCheck = this.validateMessageSize(message);
            if (!sizeCheck.valid) {
                validationResult.reason = sizeCheck.reason;
                validationResult.risks.push('message_too_large');
                return validationResult;
            }

            // 发送者检查
            const senderCheck = this.validateSender(message, options);
            if (!senderCheck.valid) {
                validationResult.reason = senderCheck.reason;
                validationResult.risks.push('unauthorized_sender');
                return validationResult;
            }

            // 消息类型检查
            const typeCheck = this.validateMessageType(message);
            if (!typeCheck.valid) {
                validationResult.reason = typeCheck.reason;
                validationResult.risks.push('invalid_message_type');
                return validationResult;
            }

            // 时间戳检查
            const timestampCheck = this.validateTimestamp(message);
            if (!timestampCheck.valid) {
                validationResult.reason = timestampCheck.reason;
                validationResult.risks.push('invalid_timestamp');
                return validationResult;
            }

            // 重放攻击检查
            if (this.options.enableReplayProtection) {
                const replayCheck = this.validateReplayProtection(message);
                if (!replayCheck.valid) {
                    validationResult.reason = replayCheck.reason;
                    validationResult.risks.push('replay_attack');
                    return validationResult;
                }
            }

            // 签名验证
            if (this.options.enableSigning && message.signature) {
                const signatureCheck = await this.validateSignature(message);
                if (!signatureCheck.valid) {
                    validationResult.reason = signatureCheck.reason;
                    validationResult.risks.push('invalid_signature');
                    return validationResult;
                }
            }

            // 数据内容安全检查
            const contentCheck = this.validateContent(message);
            if (!contentCheck.valid) {
                validationResult.reason = contentCheck.reason;
                validationResult.risks.push(...contentCheck.risks);
                return validationResult;
            }

            // 清理消息
            const sanitizedMessage = this.sanitizeMessage(message);

            validationResult.isValid = true;
            validationResult.sanitizedMessage = sanitizedMessage;

            return validationResult;

        } catch (error) {
            validationResult.reason = `验证失败: ${error.message}`;
            return validationResult;
        }
    }

    /**
     * 验证消息基础结构
     */
    validateMessageStructure(message) {
        if (!message || typeof message !== 'object') {
            return { valid: false, reason: '消息必须是对象' };
        }

        const requiredFields = ['id', 'type', 'timestamp', 'sender'];
        for (const field of requiredFields) {
            if (!(field in message)) {
                return { valid: false, reason: `缺少必需字段: ${field}` };
            }
        }

        if (typeof message.id !== 'string' || message.id.length === 0) {
            return { valid: false, reason: '消息ID无效' };
        }

        if (typeof message.type !== 'string' || message.type.length === 0) {
            return { valid: false, reason: '消息类型无效' };
        }

        if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
            return { valid: false, reason: '时间戳无效' };
        }

        if (typeof message.sender !== 'string' || message.sender.length === 0) {
            return { valid: false, reason: '发送者信息无效' };
        }

        return { valid: true };
    }

    /**
     * 验证消息大小
     */
    validateMessageSize(message) {
        const messageSize = JSON.stringify(message).length;
        if (messageSize > this.options.maxMessageSize) {
            return {
                valid: false,
                reason: `消息太大: ${messageSize} bytes (最大: ${this.options.maxMessageSize} bytes)`
            };
        }
        return { valid: true };
    }

    /**
     * 验证发送者
     */
    validateSender(message, options = {}) {
        const allowedSenders = options.allowedSenders || this.options.allowedSenders;

        if (!allowedSenders.includes(message.sender)) {
            return {
                valid: false,
                reason: `不允许的发送者: ${message.sender}`
            };
        }

        return { valid: true };
    }

    /**
     * 验证消息类型
     */
    validateMessageType(message) {
        if (!this.options.allowedMessageTypes.includes(message.type)) {
            return {
                valid: false,
                reason: `不允许的消息类型: ${message.type}`
            };
        }

        return { valid: true };
    }

    /**
     * 验证时间戳
     */
    validateTimestamp(message) {
        const now = Date.now();
        const messageTime = message.timestamp;

        // 检查消息是否过期
        if (now - messageTime > this.options.messageExpiration) {
            return {
                valid: false,
                reason: `消息已过期: ${now - messageTime}ms (最大: ${this.options.messageExpiration}ms)`
            };
        }

        // 检查消息时间戳是否太超前（防止时钟攻击）
        if (messageTime - now > 60000) { // 1分钟
            return {
                valid: false,
                reason: `消息时间戳过于超前: ${messageTime - now}ms`
            };
        }

        return { valid: true };
    }

    /**
     * 验证重放攻击防护
     */
    validateReplayProtection(message) {
        const messageId = message.id;
        const messageKey = `${message.sender}_${messageId}`;

        // 检查是否已处理过此消息
        if (this.messageCache.has(messageKey)) {
            return {
                valid: false,
                reason: `重复消息ID: ${messageId}`
            };
        }

        // 记录消息ID
        this.messageCache.set(messageKey, {
            timestamp: Date.now(),
            messageId,
            sender: message.sender
        });

        return { valid: true };
    }

    /**
     * 验证消息签名
     */
    async validateSignature(message) {
        try {
            if (!this.signingKey) {
                return { valid: false, reason: '签名密钥未初始化' };
            }

            // 重建签名数据
            const signatureData = {
                id: message.id,
                type: message.type,
                timestamp: message.timestamp,
                sender: message.sender,
                data: message.data
            };

            const signatureDataString = JSON.stringify(signatureData);
            const expectedSignature = await this.signData(signatureDataString);

            if (message.signature !== expectedSignature) {
                return { valid: false, reason: '消息签名验证失败' };
            }

            return { valid: true };

        } catch (error) {
            return { valid: false, reason: `签名验证错误: ${error.message}` };
        }
    }

    /**
     * 验证消息内容
     */
    validateContent(message) {
        const risks = [];

        // 检查数据字段
        if (message.data) {
            const dataValidation = this.validateDataContent(message.data);
            if (!dataValidation.valid) {
                return {
                    valid: false,
                    reason: dataValidation.reason,
                    risks: dataValidation.risks
                };
            }

            risks.push(...dataValidation.risks);
        }

        // 检查恶意模式
        const messageString = JSON.stringify(message);
        const maliciousPatterns = [
            { pattern: /<script[^>]*>/gi, risk: 'script_injection' },
            { pattern: /javascript:/gi, risk: 'javascript_protocol' },
            { pattern: /on\w+\s*=/gi, risk: 'event_handler' },
            { pattern: /eval\s*\(/gi, risk: 'eval_usage' },
            { pattern: /Function\s*\(/gi, risk: 'function_constructor' },
            { pattern: /data:text\/html/gi, risk: 'data_url_html' }
        ];

        for (const { pattern, risk } of maliciousPatterns) {
            if (pattern.test(messageString)) {
                risks.push(risk);
            }
        }

        return {
            valid: risks.length === 0,
            risks
        };
    }

    /**
     * 验证数据内容
     */
    validateDataContent(data) {
        const risks = [];

        if (typeof data === 'string') {
            // 检查字符串长度
            if (data.length > 10000) {
                risks.push('large_string_data');
            }

            // 检查潜在XSS内容
            const xssPatterns = [
                /<script[^>]*>.*?<\/script>/gi,
                /<iframe[^>]*>/gi,
                /<object[^>]*>/gi,
                /<embed[^>]*>/gi
            ];

            for (const pattern of xssPatterns) {
                if (pattern.test(data)) {
                    risks.push('xss_pattern');
                    break;
                }
            }
        } else if (typeof data === 'object') {
            // 检查对象深度
            const depth = this.getObjectDepth(data);
            if (depth > 10) {
                risks.push('deep_object_nesting');
            }

            // 检查对象大小
            const size = JSON.stringify(data).length;
            if (size > 100000) { // 100KB
                risks.push('large_object_data');
            }

            // 递归检查对象内容
            const objectValidation = this.validateObjectContent(data);
            if (!objectValidation.valid) {
                return {
                    valid: false,
                    reason: objectValidation.reason,
                    risks: [...risks, ...objectValidation.risks]
                };
            }

            risks.push(...objectValidation.risks);
        }

        return {
            valid: risks.length === 0,
            risks
        };
    }

    /**
     * 验证对象内容
     */
    validateObjectContent(obj, visited = new WeakSet()) {
        const risks = [];

        // 防止循环引用
        if (visited.has(obj)) {
            return { valid: false, reason: '对象包含循环引用', risks: ['circular_reference'] };
        }

        visited.add(obj);

        for (const [key, value] of Object.entries(obj)) {
            // 检查键名
            if (key.startsWith('__proto__') || key.startsWith('constructor') || key.startsWith('prototype')) {
                risks.push('dangerous_property_name');
                continue;
            }

            // 检查函数
            if (typeof value === 'function') {
                risks.push('function_in_data');
                continue;
            }

            // 递归检查嵌套对象
            if (typeof value === 'object' && value !== null) {
                const nestedValidation = this.validateObjectContent(value, visited);
                if (!nestedValidation.valid) {
                    return nestedValidation;
                }
                risks.push(...nestedValidation.risks);
            }
        }

        return {
            valid: risks.length === 0,
            risks
        };
    }

    /**
     * 获取对象深度
     */
    getObjectDepth(obj, depth = 0) {
        if (typeof obj !== 'object' || obj === null) {
            return depth;
        }

        let maxDepth = depth;
        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null) {
                const childDepth = this.getObjectDepth(value, depth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        }

        return maxDepth;
    }

    /**
     * 清理消息
     */
    sanitizeMessage(message) {
        const sanitized = { ...message };

        // 移除签名字段（验证后不再需要）
        delete sanitized.signature;

        // 清理数据内容
        if (sanitized.data) {
            sanitized.data = this.sanitizeData(sanitized.data);
        }

        return sanitized;
    }

    /**
     * 清理数据
     */
    sanitizeData(data) {
        if (typeof data === 'string') {
            // 移除潜在危险的HTML标签
            return data
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                .replace(/<object[^>]*>.*?<\/object>/gi, '')
                .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        } else if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                // 过滤危险属性名
                if (key.startsWith('__proto__') || key.startsWith('constructor') || key.startsWith('prototype')) {
                    continue;
                }

                // 递归清理
                sanitized[key] = this.sanitizeData(value);
            }
            return sanitized;
        }

        return data;
    }

    /**
     * 创建验证过的消息
     * @param {string} type - 消息类型
     * @param {*} data - 消息数据
     * @param {string} sender - 发送者
     * @param {Object} options - 选项
     */
    async createValidatedMessage(type, data, sender, options = {}) {
        const message = {
            id: generateSecureId(),
            type,
            timestamp: Date.now(),
            sender,
            data,
            version: '1.0'
        };

        // 添加签名
        if (this.options.enableSigning && this.signingKey) {
            const signatureData = {
                id: message.id,
                type: message.type,
                timestamp: message.timestamp,
                sender: message.sender,
                data: message.data
            };

            const signatureDataString = JSON.stringify(signatureData);
            message.signature = await this.signData(signatureDataString);
        }

        return message;
    }

    /**
     * 生成签名密钥
     */
    async generateSigningKey() {
        return generateSecureId(64);
    }

    /**
     * 签名数据
     */
    async signData(data) {
        if (!this.signingKey) {
            throw new Error('签名密钥未初始化');
        }

        // 使用HMAC-SHA256签名
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.signingKey);
        const messageData = encoder.encode(data);

        const crypto = window.crypto || globalThis.crypto;
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', key, messageData);
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * 清理消息缓存
     */
    cleanupMessageCache() {
        const cutoffTime = Date.now() - this.options.messageExpiration;

        for (const [key, value] of this.messageCache.entries()) {
            if (value.timestamp < cutoffTime) {
                this.messageCache.delete(key);
            }
        }
    }

    /**
     * 获取验证统计信息
     */
    getValidationStats() {
        return {
            cachedMessages: this.messageCache.size,
            allowedSenders: this.options.allowedSenders.length,
            allowedMessageTypes: this.options.allowedMessageTypes.length,
            messageExpiration: this.options.messageExpiration,
            maxMessageSize: this.options.maxMessageSize,
            signingEnabled: this.options.enableSigning,
            encryptionEnabled: this.options.enableEncryption,
            replayProtectionEnabled: this.options.enableReplayProtection
        };
    }

    /**
     * 重置验证器
     */
    reset() {
        this.messageCache.clear();
    }
}

/**
 * 安全消息传递器类
 */
export class SecureMessenger {
    constructor(options = {}) {
        this.validator = new MessageValidator(options);
        this.messageHandlers = new Map();
        this.isInitialized = false;

        this.init();
    }

    /**
     * 初始化消息传递器
     */
    async init() {
        try {
            // 绑定消息监听器
            this.bindMessageListener();

            this.isInitialized = true;
            console.log('安全消息传递器初始化完成');

        } catch (error) {
            console.error('安全消息传递器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 绑定消息监听器
     */
    bindMessageListener() {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleIncomingMessage(message, sender, sendResponse);
                return true; // 保持消息通道开放以支持异步响应
            });
        }
    }

    /**
     * 处理传入消息
     */
    async handleIncomingMessage(message, sender, sendResponse) {
        try {
            // 验证消息
            const validation = await this.validator.validateMessage(message);
            if (!validation.isValid) {
                console.warn('消息验证失败:', validation.reason);
                sendResponse({
                    success: false,
                    error: '消息验证失败',
                    code: 'VALIDATION_ERROR',
                    details: validation.reason
                });
                return;
            }

            // 获取消息处理器
            const handler = this.messageHandlers.get(message.type);
            if (!handler) {
                console.warn('未找到消息处理器:', message.type);
                sendResponse({
                    success: false,
                    error: '未知的消息类型',
                    code: 'UNKNOWN_MESSAGE_TYPE'
                });
                return;
            }

            // 执行处理器
            const result = await handler(validation.sanitizedMessage, sender);

            // 发送响应
            sendResponse({
                success: true,
                data: result,
                messageId: message.id
            });

        } catch (error) {
            console.error('处理消息时出错:', error);
            sendResponse({
                success: false,
                error: '消息处理失败',
                code: 'PROCESSING_ERROR',
                details: error.message
            });
        }
    }

    /**
     * 发送消息
     * @param {string} target - 目标 ('background', 'tab', 'popup', 'options')
     * @param {string} type - 消息类型
     * @param {*} data - 消息数据
     * @param {Object} options - 选项
     */
    async sendMessage(target, type, data, options = {}) {
        try {
            const sender = options.sender || 'content-script';

            // 创建验证过的消息
            const message = await this.validator.createValidatedMessage(type, data, sender);

            let response;

            if (target === 'background' && typeof chrome !== 'undefined' && chrome.runtime) {
                // 发送到背景脚本
                response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
            } else if (target.startsWith('tab-') && typeof chrome !== 'undefined' && chrome.tabs) {
                // 发送到指定标签页
                const tabId = parseInt(target.replace('tab-', ''));
                response = await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tabId, message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
            } else {
                throw new Error(`不支持的目标: ${target}`);
            }

            return response;

        } catch (error) {
            console.error('发送消息失败:', error);
            throw error;
        }
    }

    /**
     * 注册消息处理器
     * @param {string} messageType - 消息类型
     * @param {Function} handler - 处理函数
     */
    registerHandler(messageType, handler) {
        if (typeof handler !== 'function') {
            throw new Error('处理器必须是函数');
        }

        this.messageHandlers.set(messageType, handler);
    }

    /**
     * 注销消息处理器
     * @param {string} messageType - 消息类型
     */
    unregisterHandler(messageType) {
        this.messageHandlers.delete(messageType);
    }

    /**
     * 获取已注册的处理器
     */
    getRegisteredHandlers() {
        return Array.from(this.messageHandlers.keys());
    }

    /**
     * 获取验证统计信息
     */
    getValidationStats() {
        return this.validator.getValidationStats();
    }
}

// 创建全局安全消息传递器实例
export const secureMessenger = new SecureMessenger();

// 导出便捷函数
export async function sendSecureMessage(target, type, data, options) {
    return secureMessenger.sendMessage(target, type, data, options);
}

export function registerMessageHandler(messageType, handler) {
    return secureMessenger.registerHandler(messageType, handler);
}

export function unregisterMessageHandler(messageType) {
    return secureMessenger.unregisterHandler(messageType);
}

export function getValidationStats() {
    return secureMessenger.getValidationStats();
}

// 默认导出
export default {
    MessageValidator,
    SecureMessenger,
    secureMessenger,
    sendSecureMessage,
    registerMessageHandler,
    unregisterMessageHandler,
    getValidationStats
};