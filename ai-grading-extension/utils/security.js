/**
 * Security Manager
 * 安全管理器 - 处理加密、验证和安全相关功能
 */

import { encrypt, decrypt, hash, generateSecureId } from './security-utils.js';

export class SecurityManager {
    constructor() {
        this.encryptionKey = null;
        this.initialized = false;
        this.init();
    }

    /**
     * 初始化安全管理器
     */
    async init() {
        try {
            // 生成或获取加密密钥
            this.encryptionKey = await this.getOrCreateEncryptionKey();
            this.initialized = true;
        } catch (error) {
            // console.error('❌ 安全管理器初始化失败:', error);
            throw new Error(`安全管理器初始化失败: ${error.message}`);
        }
    }

    /**
     * 获取或创建加密密钥
     */
    async getOrCreateEncryptionKey() {
        // 首先尝试从存储中获取
        const storedKey = await this.getStoredKey();
        if (storedKey) {
            return storedKey;
        }

        // 生成新的密钥
        const newKey = await generateSecureId(32);
        await this.storeKey(newKey);
        return newKey;
    }

    /**
     * 从存储中获取密钥
     */
    async getStoredKey() {
        return new Promise(resolve => {
            chrome.storage.local.get(['encryptionKey'], result => {
                resolve(result.encryptionKey);
            });
        });
    }

    /**
     * 存储密钥
     */
    async storeKey(key) {
        return new Promise(resolve => {
            chrome.storage.local.set({ encryptionKey: key }, () => {
                resolve();
            });
        });
    }

    /**
     * 加密敏感数据
     */
    async encryptData(data) {
        if (!this.initialized) {
            throw new Error('安全管理器未初始化');
        }

        try {
            const encrypted = await encrypt(JSON.stringify(data), this.encryptionKey);
            return encrypted;
        } catch (error) {
            // console.error('数据加密失败:', error);
            throw new Error(`数据加密失败: ${error.message}`);
        }
    }

    /**
     * 解密敏感数据
     */
    async decryptData(encryptedData) {
        if (!this.initialized) {
            throw new Error('安全管理器未初始化');
        }

        try {
            const decrypted = await decrypt(encryptedData, this.encryptionKey);
            return JSON.parse(decrypted);
        } catch (error) {
            // // console.error('数据解密失败:', error);
            throw new Error(`数据解密失败: ${error.message}`);
        }
    }

    /**
     * 安全存储数据
     */
    async secureStore(key, data) {
        try {
            const encrypted = await this.encryptData(data);
            return new Promise(resolve => {
                chrome.storage.local.set({ [key]: encrypted }, () => {
                    resolve();
                });
            });
        } catch (error) {
            // console.error('安全存储失败:', error);
            throw error;
        }
    }

    /**
     * 安全获取数据
     */
    async secureRetrieve(key) {
        try {
            return new Promise(resolve => {
                chrome.storage.local.get([key], async result => {
                    if (result[key]) {
                        try {
                            const decrypted = await this.decryptData(result[key]);
                            resolve(decrypted);
                        } catch (error) {
                            // // console.error('数据解密失败:', error);
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });
        } catch (error) {
            // console.error('安全获取失败:', error);
            return null;
        }
    }

    /**
     * 验证API密钥格式
     */
    validateApiKey(key, provider) {
        if (!key || typeof key !== 'string') {
            return { valid: false, error: 'API密钥不能为空' };
        }

        const patterns = {
            openai: /^sk-[a-zA-Z0-9]{48}$/,
            azure: /^[a-zA-Z0-9]{32}$/,
            gemini: /^[a-zA-Z0-9_-]{39}$/,
            claude: /^sk-ant-[a-zA-Z0-9_-]{93}$/
        };

        const pattern = patterns[provider];
        if (!pattern) {
            return { valid: false, error: `不支持的服务提供商: ${provider}` };
        }

        if (!pattern.test(key.trim())) {
            return { valid: false, error: `无效的${provider} API密钥格式` };
        }

        return { valid: true };
    }

    /**
     * 安全处理API密钥
     */
    async secureApiKey(apiKey, provider) {
        // 验证密钥格式
        const validation = this.validateApiKey(apiKey, provider);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // 对密钥进行哈希处理（用于存储标识）
        const keyHash = await hash(apiKey);

        // 加密存储密钥
        const encryptedKey = await this.encryptData(apiKey);

        return {
            hash: keyHash,
            encrypted: encryptedKey,
            provider,
            timestamp: Date.now()
        };
    }

    /**
     * 生成安全令牌
     */
    async generateToken(length = 32) {
        return generateSecureId(length);
    }

    /**
     * 验证数据完整性
     */
    async verifyIntegrity(data, expectedHash) {
        try {
            const actualHash = await hash(JSON.stringify(data));
            return actualHash === expectedHash;
        } catch (error) {
            // console.error('完整性验证失败:', error);
            return false;
        }
    }

    /**
     * 安全清除敏感数据
     */
    async secureClear(keys) {
        try {
            return new Promise(resolve => {
                chrome.storage.local.remove(keys, () => {
                    resolve();
                });
            });
        } catch (error) {
            // console.error('安全清除失败:', error);
            throw error;
        }
    }

    /**
     * 创建安全配置
     */
    createSecureConfig(config) {
        return {
            ...config,
            security: {
                encryptionEnabled: true,
                keyRotationInterval: 24 * 60 * 60 * 1000, // 24小时
                maxFailedAttempts: 5,
                lockoutDuration: 15 * 60 * 1000, // 15分钟
                timestamp: Date.now()
            }
        };
    }

    /**
     * 检查安全状态
     */
    getSecurityStatus() {
        return {
            initialized: this.initialized,
            encryptionEnabled: !!this.encryptionKey,
            timestamp: Date.now()
        };
    }

    /**
     * 执行安全检查
     */
    async performSecurityCheck() {
        const issues = [];

        // 检查是否初始化
        if (!this.initialized) {
            issues.push({
                severity: 'high',
                type: 'initialization',
                message: '安全管理器未初始化'
            });
        }

        // 检查加密密钥
        if (!this.encryptionKey) {
            issues.push({
                severity: 'high',
                type: 'encryption',
                message: '加密密钥不可用'
            });
        }

        // 检查存储权限
        try {
            await chrome.storage.local.get(['test']);
        } catch (error) {
            issues.push({
                severity: 'medium',
                type: 'storage',
                message: '存储权限异常'
            });
        }

        return {
            status: issues.length === 0 ? 'secure' : 'issues_found',
            issues,
            timestamp: Date.now()
        };
    }

    /**
     * 销毁安全管理器
     */
    destroy() {
        this.encryptionKey = null;
        this.initialized = false;
    }
}

// 创建全局安全管理器实例
export const securityManager = SecurityManager();
