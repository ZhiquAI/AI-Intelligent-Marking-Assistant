/**
 * 增强的存储管理模块
 * @module storage
 * @description 提供安全的Chrome存储API封装,支持敏感数据加密
 */

import { encrypt, decrypt, hash } from './security-utils.js';

/**
 * 存储管理类
 */
class StorageManager {
    constructor() {
        this.isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;
        this.secureKeys = [
            'secure_apiKeys',
            'secure_openai_key',
            'secure_gemini_key',
            'secure_zhipu_key',
            'apiKeys',
            'openai_key',
            'gemini_key',
            'zhipu_key'
        ];
    }

    /**
     * 安全的设置存储
     * @param {string} key - 存储键
     * @param {any} value - 存储值
     * @param {boolean} isSensitive - 是否为敏感数据
     * @returns {Promise<boolean>} 存储是否成功
     */
    async secureSet(key, value, isSensitive = false) {
        try {
            if (!this.isChromeExtension) {
                // 降级到localStorage
                if (isSensitive && typeof value === 'string') {
                    const encrypted = await encrypt(value, 'storage_key');
                    localStorage.setItem(key, encrypted);
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
                return true;
            }

            if (isSensitive && typeof value === 'string') {
                // 加密敏感数据
                const encrypted = await encrypt(value, 'storage_key');
                await chrome.storage.local.set({ [key]: encrypted });
                return true;
            } else {
                await chrome.storage.local.set({ [key]: value });
                return true;
            }
        } catch (error) {
            // console.error(`存储失败 [${key}]:`, error);
            return false;
        }
    }

    /**
     * 安全的获取存储
     * @param {string} key - 存储键
     * @param {boolean} isSensitive - 是否为敏感数据
     * @returns {Promise<any>} 存储的值
     */
    async secureGet(key, isSensitive = false, defaultValue = null) {
        try {
            if (!this.isChromeExtension) {
                // 降级到localStorage
                const saved = localStorage.getItem(key);
                if (!saved) return defaultValue;

                if (isSensitive) {
                    try {
                        return await decrypt(saved, 'storage_key');
                    } catch (error) {
                        // // console.error('解密失败:', error);
                        return defaultValue;
                    }
                } else {
                    try {
                        return JSON.parse(saved);
                    } catch (error) {
                        return defaultValue;
                    }
                }
            }

            if (isSensitive) {
                // 获取并解密敏感数据
                const result = await chrome.storage.local.get(key);
                if (result[key]) {
                    try {
                        return await decrypt(result[key], 'storage_key');
                    } catch (error) {
                        // // console.error('解密失败:', error);
                        return defaultValue;
                    }
                }
                return defaultValue;
            } else {
                const result = await chrome.storage.local.get(key);
                return result[key] !== undefined ? result[key] : defaultValue;
            }
        } catch (error) {
            // console.error(`读取存储失败 [${key}]:`, error);
            return defaultValue;
        }
    }

    /**
     * 迁移旧的API密钥存储到安全存储
     * @returns {Promise<boolean>} 迁移是否成功
     */
    async migrateApiKeys() {
        try {
            // 1. 从localStorage读取旧数据
            const oldSettings = localStorage.getItem('aiGradingSettings');
            if (!oldSettings) {
                return true;
            }

            let settings = {};
            try {
                settings = JSON.parse(oldSettings);
            } catch (error) {
                settings = {};
            }
            if (!settings.apiKeys) {
                return true;
            }

            // 2. 提取API密钥
            const apiKeys = settings.apiKeys;
            let migratedCount = 0;

            // 3. 迁移每个API密钥
            if (apiKeys.openai?.key) {
                await this.secureSet('secure_openai_key', apiKeys.openai.key, true);
                // 清除明文密钥
                delete apiKeys.openai.key;
                migratedCount++;
            }

            if (apiKeys.gemini?.key) {
                await this.secureSet('secure_gemini_key', apiKeys.gemini.key, true);
                delete apiKeys.gemini.key;
                migratedCount++;
            }

            if (apiKeys.zhipu?.key) {
                await this.secureSet('secure_zhipu_key', apiKeys.zhipu.key, true);
                delete apiKeys.zhipu.key;
                migratedCount++;
            }

            // 4. 更新设置（移除明文密钥）
            settings.apiKeys = apiKeys;
            await this.secureSet('aiGradingSettings', settings, false);

            return true;
        } catch (error) {
            // console.error('API密钥迁移失败:', error);
            return false;
        }
    }

    /**
     * 获取API密钥（安全方式）
     * @param {string} provider - 提供商 (openai, gemini, zhipu)
     * @returns {Promise<string>} API密钥
     */
    async getApiKey(provider) {
        const key = `secure_${provider}_key`;
        return await this.secureGet(key, true, '');
    }

    /**
     * 设置API密钥（安全方式）
     * @param {string} provider - 提供商 (openai, gemini, zhipu)
     * @param {string} apiKey - API密钥
     * @returns {Promise<boolean>} 设置是否成功
     */
    async setApiKey(provider, apiKey) {
        if (!apiKey) {
            // 基本安全检查
            const securityResult = /* eslint-disable-next-line */ securityCheck(apiKey);
            if (!securityResult.safe) {
                throw new Error('API密钥包含不安全内容');
            }
            // console.error(`不安全的API密钥: ${provider}`);
            return false;
        }

        const key = `secure_${provider}_key`;
        return await this.secureSet(key, apiKey, true);
    }

    /**
     * 删除API密钥
     * @param {string} provider - 提供商 (openai, gemini, zhipu)
     * @returns {Promise<boolean>} 删除是否成功
     */
    async removeApiKey(provider) {
        const key = `secure_${provider}_key`;
        return await this.secureRemove(key);
    }
}

// 创建全局存储管理器实例
const storageManager = StorageManager();

// 导出给模块使用
export { StorageManager, storageManager };
