/**
 * Key Security Manager - 密钥安全管理器
 * 提供企业级的API密钥存储、管理和安全功能
 */

import { encrypt, decrypt, hash, generateSecureId } from '../../utils/security-utils.js';

/**
 * 密钥安全管理器类
 */
export class KeySecurityManager {
    constructor(options = {}) {
        this.options = {
            // 存储前缀
            storagePrefix: 'secure_keys_',

            // 密钥过期时间（毫秒）
            keyExpirationTime: 30 * 24 * 60 * 60 * 1000, // 30天

            // 最大重试次数
            maxRetries: 3,

            // 是否启用密钥轮换
            enableKeyRotation: true,

            // 密钥轮换间隔（毫秒）
            rotationInterval: 7 * 24 * 60 * 60 * 1000, // 7天

            // 是否启用访问日志
            enableAccessLogging: true,

            // 是否启用自动备份
            enableAutoBackup: true,

            // 备份间隔（毫秒）
            backupInterval: 24 * 60 * 60 * 1000, // 24小时

            // 支持的服务提供商
            supportedProviders: ['openai', 'gemini', 'qwen', 'glm'],

            ...options
        };

        this.masterKey = null;
        this.keyStore = new Map();
        this.accessLogs = [];
        this.rotationTimers = new Map();
        this.backupTimer = null;
        this.isInitialized = false;

        // 初始化
        this.init();
    }

    /**
     * 初始化密钥管理器
     */
    async init() {
        try {
            // 生成或恢复主密钥
            await this.initializeMasterKey();

            // 加载存储的密钥
            await this.loadStoredKeys();

            // 启动密钥轮换
            if (this.options.enableKeyRotation) {
                this.startKeyRotation();
            }

            // 启动自动备份
            if (this.options.enableAutoBackup) {
                this.startAutoBackup();
            }

            // 清理过期的访问日志
            this.cleanupAccessLogs();

            this.isInitialized = true;
            console.log('密钥安全管理器初始化完成');

        } catch (error) {
            console.error('密钥安全管理器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化主密钥
     */
    async initializeMasterKey() {
        try {
            // 尝试从存储中获取主密钥
            const storedMasterKey = await this.getFromStorage('master_key');

            if (storedMasterKey) {
                // 验证主密钥
                const isValid = await this.validateMasterKey(storedMasterKey);
                if (isValid) {
                    this.masterKey = storedMasterKey;
                    return;
                }
            }

            // 生成新的主密钥
            this.masterKey = await this.generateMasterKey();
            await this.saveToStorage('master_key', this.masterKey);

        } catch (error) {
            console.error('主密钥初始化失败:', error);
            throw error;
        }
    }

    /**
     * 生成主密钥
     */
    async generateMasterKey() {
        // 生成256位随机密钥
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);

        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 验证主密钥
     */
    async validateMasterKey(masterKey) {
        try {
            // 尝试解密测试数据
            const testData = 'validation_test';
            const encrypted = await encrypt(testData, masterKey);
            const decrypted = await decrypt(encrypted, masterKey);

            return decrypted === testData;
        } catch (error) {
            return false;
        }
    }

    /**
     * 存储API密钥
     * @param {string} provider - 服务提供商
     * @param {string} apiKey - API密钥
     * @param {Object} metadata - 元数据
     */
    async storeKey(provider, apiKey, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('密钥管理器未初始化');
        }

        if (!this.options.supportedProviders.includes(provider)) {
            throw new Error(`不支持的服务提供商: ${provider}`);
        }

        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('无效的API密钥');
        }

        try {
            // 验证密钥格式
            const keyValidation = this.validateKeyFormat(provider, apiKey);
            if (!keyValidation.valid) {
                throw new Error(`密钥格式无效: ${keyValidation.message}`);
            }

            // 创建密钥元数据
            const keyMetadata = {
                id: generateSecureId(),
                provider,
                encryptedKey: await encrypt(apiKey, this.masterKey),
                keyHash: await hash(apiKey),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastAccessed: null,
                accessCount: 0,
                version: 1,
                status: 'active',
                metadata: {
                    description: metadata.description || '',
                    environment: metadata.environment || 'production',
                    tags: metadata.tags || [],
                    ...metadata
                }
            };

            // 存储到内存
            this.keyStore.set(provider, keyMetadata);

            // 存储到持久化存储
            await this.saveToStorage(`key_${provider}`, keyMetadata);

            // 记录访问日志
            this.logAccess('store_key', provider, { keyId: keyMetadata.id });

            // 启动密钥轮换
            if (this.options.enableKeyRotation) {
                this.scheduleKeyRotation(provider);
            }

            return {
                success: true,
                keyId: keyMetadata.id,
                provider
            };

        } catch (error) {
            console.error(`存储${provider}密钥失败:`, error);
            throw error;
        }
    }

    /**
     * 获取API密钥
     * @param {string} provider - 服务提供商
     * @param {Object} options - 选项
     */
    async getKey(provider, options = {}) {
        if (!this.isInitialized) {
            throw new Error('密钥管理器未初始化');
        }

        const keyMetadata = this.keyStore.get(provider);
        if (!keyMetadata) {
            throw new Error(`未找到${provider}的密钥`);
        }

        try {
            // 检查密钥状态
            if (keyMetadata.status !== 'active') {
                throw new Error(`${provider}密钥已${keyMetadata.status}`);
            }

            // 检查密钥是否过期
            if (this.isKeyExpired(keyMetadata)) {
                throw new Error(`${provider}密钥已过期`);
            }

            // 解密密钥
            const decryptedKey = await decrypt(keyMetadata.encryptedKey, this.masterKey);

            // 验证密钥完整性
            const currentHash = await hash(decryptedKey);
            if (currentHash !== keyMetadata.keyHash) {
                throw new Error(`${provider}密钥完整性验证失败`);
            }

            // 更新访问信息
            keyMetadata.lastAccessed = Date.now();
            keyMetadata.accessCount += 1;
            await this.saveToStorage(`key_${provider}`, keyMetadata);

            // 记录访问日志
            this.logAccess('get_key', provider, { keyId: keyMetadata.id, options });

            // 返回密钥（根据选项决定是否返回完整密钥）
            if (options.partial) {
                return this.maskKey(decryptedKey);
            }

            return decryptedKey;

        } catch (error) {
            console.error(`获取${provider}密钥失败:`, error);
            throw error;
        }
    }

    /**
     * 删除API密钥
     * @param {string} provider - 服务提供商
     */
    async deleteKey(provider) {
        if (!this.isInitialized) {
            throw new Error('密钥管理器未初始化');
        }

        const keyMetadata = this.keyStore.get(provider);
        if (!keyMetadata) {
            throw new Error(`未找到${provider}的密钥`);
        }

        try {
            // 从内存中移除
            this.keyStore.delete(provider);

            // 从持久化存储中移除
            await this.removeFromStorage(`key_${provider}`);

            // 取消轮换定时器
            if (this.rotationTimers.has(provider)) {
                clearTimeout(this.rotationTimers.get(provider));
                this.rotationTimers.delete(provider);
            }

            // 记录访问日志
            this.logAccess('delete_key', provider, { keyId: keyMetadata.id });

            return { success: true, provider };

        } catch (error) {
            console.error(`删除${provider}密钥失败:`, error);
            throw error;
        }
    }

    /**
     * 轮换API密钥
     * @param {string} provider - 服务提供商
     * @param {string} newKey - 新密钥
     */
    async rotateKey(provider, newKey) {
        if (!this.isInitialized) {
            throw new Error('密钥管理器未初始化');
        }

        const keyMetadata = this.keyStore.get(provider);
        if (!keyMetadata) {
            throw new Error(`未找到${provider}的密钥`);
        }

        try {
            // 备份当前密钥
            const backupId = await this.backupKey(provider, 'rotation');

            // 验证新密钥格式
            const keyValidation = this.validateKeyFormat(provider, newKey);
            if (!keyValidation.valid) {
                throw new Error(`新密钥格式无效: ${keyValidation.message}`);
            }

            // 创建新密钥元数据
            const newMetadata = {
                ...keyMetadata,
                encryptedKey: await encrypt(newKey, this.masterKey),
                keyHash: await hash(newKey),
                updatedAt: Date.now(),
                version: keyMetadata.version + 1,
                previousVersionId: backupId,
                status: 'active'
            };

            // 更新存储
            this.keyStore.set(provider, newMetadata);
            await this.saveToStorage(`key_${provider}`, newMetadata);

            // 记录访问日志
            this.logAccess('rotate_key', provider, {
                keyId: keyMetadata.id,
                newVersion: newMetadata.version,
                backupId
            });

            // 重新调度轮换
            if (this.options.enableKeyRotation) {
                this.scheduleKeyRotation(provider);
            }

            return {
                success: true,
                provider,
                newVersion: newMetadata.version,
                backupId
            };

        } catch (error) {
            console.error(`轮换${provider}密钥失败:`, error);
            throw error;
        }
    }

    /**
     * 验证密钥格式
     */
    validateKeyFormat(provider, apiKey) {
        const patterns = {
            openai: /^sk-[A-Za-z0-9]{48}$/,
            gemini: /^[A-Za-z0-9_-]{39}$/,
            qwen: /^sk-[A-Za-z0-9]{32}$/,
            glm: /^[A-Za-z0-9_-]{32}$/
        };

        const pattern = patterns[provider];
        if (!pattern) {
            return { valid: false, message: '未知的服务提供商' };
        }

        const isValid = pattern.test(apiKey);
        return {
            valid: isValid,
            message: isValid ? '密钥格式正确' : '密钥格式不正确'
        };
    }

    /**
     * 检查密钥是否过期
     */
    isKeyExpired(keyMetadata) {
        const expirationTime = keyMetadata.createdAt + this.options.keyExpirationTime;
        return Date.now() > expirationTime;
    }

    /**
     * 屏蔽密钥显示
     */
    maskKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return '***';
        }

        const start = apiKey.substring(0, 4);
        const end = apiKey.substring(apiKey.length - 4);
        const middle = '*'.repeat(apiKey.length - 8);

        return `${start}${middle}${end}`;
    }

    /**
     * 启动密钥轮换
     */
    startKeyRotation() {
        for (const provider of this.options.supportedProviders) {
            if (this.keyStore.has(provider)) {
                this.scheduleKeyRotation(provider);
            }
        }
    }

    /**
     * 调度密钥轮换
     */
    scheduleKeyRotation(provider) {
        // 取消现有的轮换定时器
        if (this.rotationTimers.has(provider)) {
            clearTimeout(this.rotationTimers.get(provider));
        }

        // 设置新的轮换定时器
        const timer = setTimeout(async () => {
            try {
                // 发送轮换提醒
                this.notifyKeyRotation(provider);

                // 重新调度
                this.scheduleKeyRotation(provider);
            } catch (error) {
                console.error(`密钥轮换提醒失败 (${provider}):`, error);
            }
        }, this.options.rotationInterval);

        this.rotationTimers.set(provider, timer);
    }

    /**
     * 通知密钥轮换
     */
    notifyKeyRotation(provider) {
        const event = new CustomEvent('keyRotationReminder', {
            detail: {
                provider,
                message: `${provider} API密钥建议轮换`,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 启动自动备份
     */
    startAutoBackup() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }

        this.backupTimer = setInterval(async () => {
            try {
                await this.createBackup('auto');
            } catch (error) {
                console.error('自动备份失败:', error);
            }
        }, this.options.backupInterval);
    }

    /**
     * 创建备份
     */
    async createBackup(type = 'manual') {
        const backupData = {
            id: generateSecureId(),
            type,
            timestamp: Date.now(),
            keys: {},
            version: '1.0'
        };

        // 备份所有密钥
        for (const [provider, keyMetadata] of this.keyStore) {
            backupData.keys[provider] = {
                ...keyMetadata,
                backupTimestamp: Date.now()
            };
        }

        // 加密备份数据
        const backupKey = await this.generateMasterKey();
        const encryptedBackup = await encrypt(JSON.stringify(backupData), backupKey);

        // 存储备份
        const backupInfo = {
            id: backupData.id,
            type,
            timestamp: backupData.timestamp,
            encryptedBackup,
            backupKey: await encrypt(backupKey, this.masterKey)
        };

        await this.saveToStorage(`backup_${backupData.id}`, backupInfo);

        // 记录访问日志
        this.logAccess('create_backup', null, {
            backupId: backupData.id,
            type,
            keyCount: Object.keys(backupData.keys).length
        });

        return backupData.id;
    }

    /**
     * 备份单个密钥
     */
    async backupKey(provider, reason = 'manual') {
        const keyMetadata = this.keyStore.get(provider);
        if (!keyMetadata) {
            throw new Error(`未找到${provider}的密钥`);
        }

        const backupData = {
            ...keyMetadata,
            backupReason: reason,
            backupTimestamp: Date.now()
        };

        const backupId = generateSecureId();
        await this.saveToStorage(`key_backup_${backupId}`, backupData);

        return backupId;
    }

    /**
     * 恢复密钥
     */
    async restoreKeys(backupId) {
        try {
            const backupInfo = await this.getFromStorage(`backup_${backupId}`);
            if (!backupInfo) {
                throw new Error('备份不存在');
            }

            // 解密备份密钥
            const backupKey = await decrypt(backupInfo.backupKey, this.masterKey);

            // 解密备份数据
            const encryptedBackup = backupInfo.encryptedBackup;
            const backupData = JSON.parse(await decrypt(encryptedBackup, backupKey));

            // 恢复密钥
            for (const [provider, keyData] of Object.entries(backupData.keys)) {
                this.keyStore.set(provider, keyData);
                await this.saveToStorage(`key_${provider}`, keyData);
            }

            // 记录访问日志
            this.logAccess('restore_backup', null, {
                backupId,
                restoredKeys: Object.keys(backupData.keys)
            });

            return {
                success: true,
                restoredKeys: Object.keys(backupData.keys),
                backupTimestamp: backupData.timestamp
            };

        } catch (error) {
            console.error('恢复备份失败:', error);
            throw error;
        }
    }

    /**
     * 记录访问日志
     */
    logAccess(action, provider, data = {}) {
        if (!this.options.enableAccessLogging) return;

        const logEntry = {
            id: generateSecureId(),
            timestamp: Date.now(),
            action,
            provider,
            data,
            userAgent: navigator.userAgent,
            sessionId: this.getSessionId()
        };

        this.accessLogs.push(logEntry);

        // 限制日志数量
        if (this.accessLogs.length > 1000) {
            this.accessLogs.shift();
        }

        // 触发安全事件
        this.dispatchSecurityEvent(action, provider, data);
    }

    /**
     * 清理过期的访问日志
     */
    cleanupAccessLogs() {
        const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30天前
        this.accessLogs = this.accessLogs.filter(log => log.timestamp > cutoffTime);
    }

    /**
     * 分发安全事件
     */
    dispatchSecurityEvent(action, provider, data) {
        const event = new CustomEvent('keySecurityEvent', {
            detail: {
                action,
                provider,
                data,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 获取会话ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('key_manager_session_id');
        if (!sessionId) {
            sessionId = generateSecureId();
            sessionStorage.setItem('key_manager_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * 从存储中获取数据
     */
    async getFromStorage(key) {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get([this.options.storagePrefix + key], (result) => {
                    resolve(result[this.options.storagePrefix + key]);
                });
            } else {
                const value = localStorage.getItem(this.options.storagePrefix + key);
                resolve(value ? JSON.parse(value) : null);
            }
        });
    }

    /**
     * 保存数据到存储
     */
    async saveToStorage(key, value) {
        return new Promise((resolve) => {
            const storageKey = this.options.storagePrefix + key;
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const data = {};
                data[storageKey] = value;
                chrome.storage.local.set(data, resolve);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(value));
                resolve();
            }
        });
    }

    /**
     * 从存储中移除数据
     */
    async removeFromStorage(key) {
        return new Promise((resolve) => {
            const storageKey = this.options.storagePrefix + key;
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.remove([storageKey], resolve);
            } else {
                localStorage.removeItem(storageKey);
                resolve();
            }
        });
    }

    /**
     * 加载存储的密钥
     */
    async loadStoredKeys() {
        for (const provider of this.options.supportedProviders) {
            try {
                const keyData = await this.getFromStorage(`key_${provider}`);
                if (keyData) {
                    this.keyStore.set(provider, keyData);
                }
            } catch (error) {
                console.warn(`加载${provider}密钥失败:`, error);
            }
        }
    }

    /**
     * 获取密钥状态
     */
    getKeyStatus(provider) {
        const keyMetadata = this.keyStore.get(provider);
        if (!keyMetadata) {
            return { status: 'not_found', provider };
        }

        return {
            status: keyMetadata.status,
            provider,
            createdAt: keyMetadata.createdAt,
            updatedAt: keyMetadata.updatedAt,
            lastAccessed: keyMetadata.lastAccessed,
            accessCount: keyMetadata.accessCount,
            version: keyMetadata.version,
            isExpired: this.isKeyExpired(keyMetadata),
            maskedKey: this.maskKey('sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
        };
    }

    /**
     * 获取所有密钥状态
     */
    getAllKeyStatuses() {
        const statuses = {};
        for (const provider of this.options.supportedProviders) {
            statuses[provider] = this.getKeyStatus(provider);
        }
        return statuses;
    }

    /**
     * 获取访问日志
     */
    getAccessLogs(options = {}) {
        let logs = [...this.accessLogs];

        // 过滤
        if (options.provider) {
            logs = logs.filter(log => log.provider === options.provider);
        }

        if (options.action) {
            logs = logs.filter(log => log.action === options.action);
        }

        if (options.startTime) {
            logs = logs.filter(log => log.timestamp >= options.startTime);
        }

        if (options.endTime) {
            logs = logs.filter(log => log.timestamp <= options.endTime);
        }

        // 排序
        logs.sort((a, b) => b.timestamp - a.timestamp);

        // 限制数量
        if (options.limit) {
            logs = logs.slice(0, options.limit);
        }

        return logs;
    }

    /**
     * 获取安全统计信息
     */
    getSecurityStats() {
        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

        const recentLogs = this.accessLogs.filter(log => log.timestamp > dayAgo);
        const weeklyLogs = this.accessLogs.filter(log => log.timestamp > weekAgo);

        const activeKeys = Array.from(this.keyStore.values()).filter(key =>
            key.status === 'active' && !this.isKeyExpired(key)
        ).length;

        return {
            totalKeys: this.keyStore.size,
            activeKeys,
            expiredKeys: Array.from(this.keyStore.values()).filter(key =>
                this.isKeyExpired(key)
            ).length,
            totalAccessLogs: this.accessLogs.length,
            recentAccessLogs: recentLogs.length,
            weeklyAccessLogs: weeklyLogs.length,
            lastRotation: Math.max(...Array.from(this.keyStore.values()).map(key => key.updatedAt)),
            securityScore: this.calculateSecurityScore()
        };
    }

    /**
     * 计算安全评分
     */
    calculateSecurityScore() {
        let score = 100;

        // 检查密钥过期情况
        const expiredKeys = Array.from(this.keyStore.values()).filter(key =>
            this.isKeyExpired(key)
        ).length;
        score -= expiredKeys * 20;

        // 检查访问频率异常
        const recentLogs = this.getAccessLogs({ startTime: Date.now() - (24 * 60 * 60 * 1000) });
        if (recentLogs.length > 100) {
            score -= 10;
        }

        // 检查错误访问尝试
        const errorLogs = recentLogs.filter(log =>
            log.action === 'get_key' && log.data.error
        ).length;
        score -= errorLogs * 5;

        return Math.max(0, score);
    }

    /**
     * 销毁密钥管理器
     */
    async destroy() {
        // 清理定时器
        for (const timer of this.rotationTimers.values()) {
            clearTimeout(timer);
        }
        this.rotationTimers.clear();

        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }

        // 创建最终备份
        try {
            await this.createBackup('shutdown');
        } catch (error) {
            console.error('关闭时备份失败:', error);
        }

        // 清理内存
        this.keyStore.clear();
        this.accessLogs = [];
        this.masterKey = null;
        this.isInitialized = false;
    }
}

// 创建全局密钥管理器实例
export const keyManager = new KeySecurityManager();

// 导出便捷函数
export async function storeApiKey(provider, apiKey, metadata) {
    return keyManager.storeKey(provider, apiKey, metadata);
}

export async function getApiKey(provider, options) {
    return keyManager.getKey(provider, options);
}

export async function deleteApiKey(provider) {
    return keyManager.deleteKey(provider);
}

export async function rotateApiKey(provider, newKey) {
    return keyManager.rotateKey(provider, newKey);
}

export function getKeyStatus(provider) {
    return keyManager.getKeyStatus(provider);
}

export function getAllKeyStatuses() {
    return keyManager.getAllKeyStatuses();
}

export function getSecurityStats() {
    return keyManager.getSecurityStats();
}

export function getAccessLogs(options) {
    return keyManager.getAccessLogs(options);
}

// 默认导出
export default {
    KeySecurityManager,
    keyManager,
    storeApiKey,
    getApiKey,
    deleteApiKey,
    rotateApiKey,
    getKeyStatus,
    getAllKeyStatuses,
    getSecurityStats,
    getAccessLogs
};