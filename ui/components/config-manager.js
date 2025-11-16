/**
 * 智学AI - 配置管理器
 * 统一管理应用配置的保存、加载、验证和同步功能
 */

import { EventEmitter } from '../utils/event-manager.js';
import { sendBackgroundMessage } from '../utils/messenger.js';
import { KeySecurityManager } from '../security/key-manager.js';
import { validateData, generateSecureId, hash } from '../utils/security-utils.js';
import { defaultStatusIndicator } from './status-indicator.js';

export class ConfigManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            autoSave: options.autoSave ?? true,
            autoSaveDelay: options.autoSaveDelay ?? 2000, // 自动保存延迟（毫秒）
            enableEncryption: options.enableEncryption ?? true,
            enableValidation: options.enableValidation ?? true,
            enableBackup: options.enableBackup ?? true,
            maxBackups: options.maxBackups ?? 5,
            syncInterval: options.syncInterval ?? 60000, // 同步间隔（毫秒）
            storageKey: options.storageKey ?? 'zhixue-config',
            encryptionKey: options.encryptionKey ?? null,
            schemaValidation: options.schemaValidation ?? true,
            ...options
        };

        // 配置模式定义
        this.schemas = new Map();
        this.defaultConfigs = new Map();
        this.configVersions = new Map();

        // 状态管理
        this.currentConfig = {};
        this.pendingChanges = new Map();
        this.isDirty = false;
        this.isSaving = false;
        this.isLoading = false;

        // 自动保存定时器
        this.autoSaveTimer = null;
        this.syncTimer = null;

        // 加密管理器
        this.keyManager = null;
        if (this.options.enableEncryption) {
            this.keyManager = new KeySecurityManager();
        }

        // 备份管理
        this.backups = [];
        this.backupIndex = 0;

        // 变更历史
        this.changeHistory = [];
        this.maxHistorySize = 100;

        // 初始化
        this.init();
    }

    async init() {
        try {
            console.log('配置管理器初始化中...');

            // 注册默认配置模式
            this.registerDefaultSchemas();

            // 加载配置
            await this.loadConfig();

            // 启动同步定时器
            if (this.options.syncInterval > 0) {
                this.startSyncTimer();
            }

            // 监听页面关闭事件
            this.setupPageUnloadHandler();

            console.log('配置管理器初始化完成');
            this.emit('initialized', this.currentConfig);

        } catch (error) {
            console.error('配置管理器初始化失败:', error);
            this.emit('error', error);
        }
    }

    registerDefaultSchemas() {
        // 应用配置模式
        this.registerSchema('app', {
            type: 'object',
            properties: {
                version: { type: 'string', required: true },
                theme: { type: 'string', enum: ['auto', 'light', 'dark'], default: 'auto' },
                language: { type: 'string', enum: ['zh-CN', 'zh-TW', 'en-US'], default: 'zh-CN' },
                autoSave: { type: 'boolean', default: true },
                showTooltips: { type: 'boolean', default: true },
                notifications: { type: 'boolean', default: true },
                debugMode: { type: 'boolean', default: false }
            },
            required: ['version']
        });

        // AI配置模式
        this.registerSchema('ai', {
            type: 'object',
            properties: {
                providers: { type: 'array', required: true },
                defaultProvider: { type: 'string', required: true },
                temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
                maxTokens: { type: 'number', min: 1, max: 128000, default: 4000 },
                timeout: { type: 'number', min: 1000, max: 300000, default: 30000 },
                retryCount: { type: 'number', min: 0, max: 10, default: 3 },
                enableCache: { type: 'boolean', default: true },
                cacheSize: { type: 'number', min: 10, max: 1000, default: 100 }
            },
            required: ['providers', 'defaultProvider']
        });

        // UI配置模式
        this.registerSchema('ui', {
            type: 'object',
            properties: {
                position: {
                    type: 'object',
                    properties: {
                        main: { type: 'string', enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left'] },
                        settings: { type: 'string', enum: ['center', 'top-right', 'top-left'] }
                    }
                },
                layout: {
                    type: 'object',
                    properties: {
                        compact: { type: 'boolean', default: false },
                        showAdvanced: { type: 'boolean', default: false }
                    }
                },
                animations: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean', default: true },
                        speed: { type: 'string', enum: ['slow', 'normal', 'fast'], default: 'normal' }
                    }
                }
            }
        });

        // 安全配置模式
        this.registerSchema('security', {
            type: 'object',
            properties: {
                enableLogging: { type: 'boolean', default: true },
                logLevel: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
                keyRotationDays: { type: 'number', min: 7, max: 365, default: 90 },
                sessionTimeout: { type: 'number', min: 300000, max: 86400000, default: 3600000 },
                enforceCSP: { type: 'boolean', default: true },
                maxFailedAttempts: { type: 'number', min: 3, max: 10, default: 5 }
            }
        });

        // 性能配置模式
        this.registerSchema('performance', {
            type: 'object',
            properties: {
                enableCaching: { type: 'boolean', default: true },
                cacheSize: { type: 'number', min: 10, max: 500, default: 100 },
                enablePrefetch: { type: 'boolean', default: true },
                debounceDelay: { type: 'number', min: 100, max: 2000, default: 500 },
                maxConcurrentRequests: { type: 'number', min: 1, max: 10, default: 3 }
            }
        });
    }

    /**
     * 注册配置模式
     * @param {string} namespace - 配置命名空间
     * @param {Object} schema - JSON Schema定义
     * @param {Object} defaultConfig - 默认配置
     */
    registerSchema(namespace, schema, defaultConfig = {}) {
        const validation = validateData({ namespace, schema }, 'object');
        if (!validation.valid) {
            throw new Error(`配置模式注册失败: ${validation.error}`);
        }

        this.schemas.set(namespace, schema);
        this.defaultConfigs.set(namespace, defaultConfig);
        this.configVersions.set(namespace, Date.now());

        this.emit('schemaRegistered', { namespace, schema });
    }

    /**
     * 验证配置
     * @param {string} namespace - 配置命名空间
     * @param {Object} config - 配置对象
     * @returns {Object} 验证结果
     */
    validateConfig(namespace, config) {
        if (!this.options.enableValidation) {
            return { valid: true, errors: [] };
        }

        const schema = this.schemas.get(namespace);
        if (!schema) {
            return { valid: false, errors: [`未知的配置命名空间: ${namespace}`] };
        }

        const validation = validateData(config, schema.type);
        if (!validation.valid) {
            return { valid: false, errors: [validation.error] };
        }

        // 自定义验证
        const errors = this.customValidation(namespace, config);

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 自定义验证逻辑
     * @param {string} namespace - 配置命名空间
     * @param {Object} config - 配置对象
     * @returns {Array} 错误列表
     */
    customValidation(namespace, config) {
        const errors = [];

        switch (namespace) {
            case 'ai':
                if (config.providers && Array.isArray(config.providers)) {
                    const enabledProviders = config.providers.filter(p => p.enabled);
                    if (enabledProviders.length === 0) {
                        errors.push('至少需要启用一个AI提供商');
                    }
                }
                break;

            case 'app':
                if (config.version && typeof config.version === 'string') {
                    // 验证版本格式
                    const versionRegex = /^\d+\.\d+\.\d+$/;
                    if (!versionRegex.test(config.version)) {
                        errors.push('版本号格式无效，应为 x.y.z 格式');
                    }
                }
                break;

            case 'security':
                if (config.keyRotationDays && config.sessionTimeout) {
                    const rotationMs = config.keyRotationDays * 24 * 60 * 60 * 1000;
                    if (config.sessionTimeout > rotationMs) {
                        errors.push('会话超时时间不能超过密钥轮换周期');
                    }
                }
                break;
        }

        return errors;
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        if (this.isLoading) return;

        this.isLoading = true;

        try {
            // 从存储加载配置
            const storedConfig = await sendBackgroundMessage('storage.get', [this.options.storageKey]);

            if (storedConfig && typeof storedConfig === 'object') {
                // 解密配置
                let configData = storedConfig;
                if (this.options.enableEncryption && storedConfig.encrypted) {
                    configData = await this.decryptConfig(storedConfig);
                }

                // 验证配置
                const validation = this.validateFullConfig(configData);
                if (!validation.valid) {
                    console.warn('加载的配置验证失败:', validation.errors);
                    // 使用默认配置
                    configData = this.getDefaultConfig();
                }

                // 应用配置
                this.currentConfig = configData;

                // 加载备份
                if (this.options.enableBackup) {
                    await this.loadBackups();
                }

            } else {
                // 使用默认配置
                this.currentConfig = this.getDefaultConfig();
            }

            // 合并默认配置
            this.mergeWithDefaults();

            this.emit('configLoaded', this.currentConfig);

        } catch (error) {
            console.error('加载配置失败:', error);
            this.currentConfig = this.getDefaultConfig();
            this.emit('error', error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 保存配置
     * @param {boolean} force - 强制保存，忽略自动保存延迟
     */
    async saveConfig(force = false) {
        if (this.isSaving) return;

        // 如果有自动保存延迟且不是强制保存
        if (!force && this.options.autoSave && this.options.autoSaveDelay > 0) {
            this.scheduleAutoSave();
            return;
        }

        try {
            this.isSaving = true;
            this.isDirty = false;

            // 验证配置
            const validation = this.validateFullConfig(this.currentConfig);
            if (!validation.valid) {
                throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
            }

            // 创建备份
            if (this.options.enableBackup) {
                await this.createBackup();
            }

            // 准备保存数据
            let saveData = { ...this.currentConfig };

            // 加密配置
            if (this.options.enableEncryption) {
                saveData = await this.encryptConfig(saveData);
            }

            // 添加元数据
            saveData = {
                ...saveData,
                metadata: {
                    version: Date.now(),
                    timestamp: Date.now(),
                    checksum: await this.calculateChecksum(this.currentConfig)
                }
            };

            // 保存到存储
            await sendBackgroundMessage('storage.set', {
                [this.options.storageKey]: saveData
            });

            // 清除待保存的变更
            this.pendingChanges.clear();

            // 显示成功通知
            defaultStatusIndicator.showNotification({
                type: 'success',
                message: '配置保存成功',
                title: '保存完成'
            });

            this.emit('configSaved', this.currentConfig);

        } catch (error) {
            console.error('保存配置失败:', error);
            this.isDirty = true;

            defaultStatusIndicator.showNotification({
                type: 'error',
                message: `保存配置失败: ${error.message}`,
                title: '保存失败'
            });

            this.emit('error', error);
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * 更新配置
     * @param {string} namespace - 配置命名空间
     * @param {string} key - 配置键
     * @param {*} value - 配置值
     * @param {boolean} immediate - 立即保存
     */
    updateConfig(namespace, key, value, immediate = false) {
        const oldValue = this.getConfig(namespace, key);

        // 值未变化则不处理
        if (JSON.stringify(oldValue) === JSON.stringify(value)) {
            return;
        }

        // 更新配置
        if (!this.currentConfig[namespace]) {
            this.currentConfig[namespace] = {};
        }

        this.currentConfig[namespace][key] = value;

        // 记录变更
        this.pendingChanges.set(`${namespace}.${key}`, {
            namespace,
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now()
        });

        // 添加到变更历史
        this.addToChangeHistory({
            type: 'update',
            namespace,
            key,
            oldValue,
            newValue: value,
            timestamp: Date.now()
        });

        this.isDirty = true;

        // 发射变更事件
        this.emit('configChanged', { namespace, key, value, oldValue });

        // 立即保存或调度自动保存
        if (immediate) {
            this.saveConfig(true);
        } else if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
    }

    /**
     * 批量更新配置
     * @param {string} namespace - 配置命名空间
     * @param {Object} updates - 更新对象
     * @param {boolean} immediate - 立即保存
     */
    updateConfigBatch(namespace, updates, immediate = false) {
        const changes = [];

        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.getConfig(namespace, key);

            if (JSON.stringify(oldValue) === JSON.stringify(value)) {
                return;
            }

            if (!this.currentConfig[namespace]) {
                this.currentConfig[namespace] = {};
            }

            this.currentConfig[namespace][key] = value;

            changes.push({ namespace, key, oldValue, newValue: value });

            this.pendingChanges.set(`${namespace}.${key}`, {
                namespace,
                key,
                oldValue,
                newValue: value,
                timestamp: Date.now()
            });
        });

        if (changes.length === 0) return;

        // 添加到变更历史
        this.addToChangeHistory({
            type: 'batch-update',
            namespace,
            changes,
            timestamp: Date.now()
        });

        this.isDirty = true;

        // 发射变更事件
        this.emit('configBatchChanged', { namespace, changes });

        // 保存
        if (immediate) {
            this.saveConfig(true);
        } else if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
    }

    /**
     * 获取配置值
     * @param {string} namespace - 配置命名空间
     * @param {string} key - 配置键
     * @param {*} defaultValue - 默认值
     * @returns {*} 配置值
     */
    getConfig(namespace, key, defaultValue = null) {
        const namespaceConfig = this.currentConfig[namespace] || {};
        const value = namespaceConfig[key];

        return value !== undefined ? value : defaultValue;
    }

    /**
     * 获取整个命名空间配置
     * @param {string} namespace - 配置命名空间
     * @returns {Object} 配置对象
     */
    getNamespaceConfig(namespace) {
        return { ...this.currentConfig[namespace] } || {};
    }

    /**
     * 获取完整配置
     * @returns {Object} 完整配置
     */
    getFullConfig() {
        return { ...this.currentConfig };
    }

    /**
     * 重置配置
     * @param {string} namespace - 配置命名空间，不提供则重置所有
     */
    resetConfig(namespace = null) {
        if (namespace) {
            const defaultConfig = this.defaultConfigs.get(namespace) || {};
            this.currentConfig[namespace] = { ...defaultConfig };

            this.addToChangeHistory({
                type: 'reset',
                namespace,
                timestamp: Date.now()
            });

            this.emit('configReset', { namespace });
        } else {
            this.currentConfig = this.getDefaultConfig();

            this.addToChangeHistory({
                type: 'full-reset',
                timestamp: Date.now()
            });

            this.emit('fullConfigReset');
        }

        this.isDirty = true;

        if (this.options.autoSave) {
            this.saveConfig(true);
        }
    }

    /**
     * 导出配置
     * @param {Array} namespaces - 要导出的命名空间，不提供则导出所有
     * @param {boolean} includeMetadata - 是否包含元数据
     * @returns {Object} 导出的配置
     */
    exportConfig(namespaces = null, includeMetadata = false) {
        const exportData = {};

        if (namespaces && Array.isArray(namespaces)) {
            namespaces.forEach(ns => {
                exportData[ns] = this.getNamespaceConfig(ns);
            });
        } else {
            exportData = this.getFullConfig();
        }

        if (includeMetadata) {
            exportData._metadata = {
                exportedAt: Date.now(),
                version: '1.0.0',
                checksum: this.calculateChecksumSync(exportData)
            };
        }

        return exportData;
    }

    /**
     * 导入配置
     * @param {Object} configData - 配置数据
     * @param {boolean} merge - 是否合并现有配置
     * @returns {boolean} 导入是否成功
     */
    async importConfig(configData, merge = false) {
        try {
            // 验证导入数据
            const validation = this.validateFullConfig(configData);
            if (!validation.valid) {
                throw new Error(`导入配置验证失败: ${validation.errors.join(', ')}`);
            }

            // 清除元数据
            const cleanData = { ...configData };
            delete cleanData._metadata;

            if (merge) {
                // 合并配置
                Object.entries(cleanData).forEach(([namespace, config]) => {
                    if (this.currentConfig[namespace]) {
                        this.currentConfig[namespace] = {
                            ...this.currentConfig[namespace],
                            ...config
                        };
                    } else {
                        this.currentConfig[namespace] = config;
                    }
                });
            } else {
                // 完全替换
                this.currentConfig = cleanData;
            }

            this.isDirty = true;
            this.addToChangeHistory({
                type: 'import',
                merge,
                timestamp: Date.now()
            });

            // 保存配置
            await this.saveConfig(true);

            this.emit('configImported', { configData, merge });

            defaultStatusIndicator.showNotification({
                type: 'success',
                message: '配置导入成功',
                title: '导入完成'
            });

            return true;

        } catch (error) {
            console.error('导入配置失败:', error);

            defaultStatusIndicator.showNotification({
                type: 'error',
                message: `导入配置失败: ${error.message}`,
                title: '导入失败'
            });

            return false;
        }
    }

    /**
     * 创建配置备份
     */
    async createBackup() {
        try {
            const backup = {
                id: generateSecureId(8),
                timestamp: Date.now(),
                config: { ...this.currentConfig },
                checksum: await this.calculateChecksum(this.currentConfig)
            };

            this.backups.unshift(backup);

            // 限制备份数量
            if (this.backups.length > this.options.maxBackups) {
                this.backups = this.backups.slice(0, this.options.maxBackups);
            }

            // 保存备份
            await sendBackgroundMessage('storage.set', {
                [`${this.options.storageKey}-backups`]: this.backups
            });

            this.emit('backupCreated', backup);

        } catch (error) {
            console.error('创建配置备份失败:', error);
        }
    }

    /**
     * 加载备份
     */
    async loadBackups() {
        try {
            const storedBackups = await sendBackgroundMessage('storage.get', [`${this.options.storageKey}-backups`]);
            if (storedBackups && Array.isArray(storedBackups)) {
                this.backups = storedBackups;
            }
        } catch (error) {
            console.error('加载配置备份失败:', error);
        }
    }

    /**
     * 恢复备份
     * @param {string} backupId - 备份ID
     * @returns {boolean} 恢复是否成功
     */
    async restoreBackup(backupId) {
        try {
            const backup = this.backups.find(b => b.id === backupId);
            if (!backup) {
                throw new Error('备份不存在');
            }

            // 验证备份完整性
            const currentChecksum = await this.calculateChecksum(backup.config);
            if (currentChecksum !== backup.checksum) {
                throw new Error('备份数据损坏');
            }

            // 创建当前配置的备份
            await this.createBackup();

            // 恢复配置
            this.currentConfig = { ...backup.config };
            this.isDirty = true;

            this.addToChangeHistory({
                type: 'restore-backup',
                backupId,
                timestamp: Date.now()
            });

            // 保存配置
            await this.saveConfig(true);

            this.emit('backupRestored', backup);

            defaultStatusIndicator.showNotification({
                type: 'success',
                message: `配置已恢复到 ${new Date(backup.timestamp).toLocaleString()}`,
                title: '恢复成功'
            });

            return true;

        } catch (error) {
            console.error('恢复配置备份失败:', error);

            defaultStatusIndicator.showNotification({
                type: 'error',
                message: `恢复配置失败: ${error.message}`,
                title: '恢复失败'
            });

            return false;
        }
    }

    /**
     * 获取备份列表
     * @returns {Array} 备份列表
     */
    getBackups() {
        return [...this.backups];
    }

    /**
     * 删除备份
     * @param {string} backupId - 备份ID
     * @returns {boolean} 删除是否成功
     */
    async deleteBackup(backupId) {
        try {
            const index = this.backups.findIndex(b => b.id === backupId);
            if (index === -1) {
                throw new Error('备份不存在');
            }

            this.backups.splice(index, 1);

            await sendBackgroundMessage('storage.set', {
                [`${this.options.storageKey}-backups`]: this.backups
            });

            this.emit('backupDeleted', backupId);

            return true;

        } catch (error) {
            console.error('删除配置备份失败:', error);
            return false;
        }
    }

    /**
     * 调度自动保存
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            this.saveConfig();
        }, this.options.autoSaveDelay);
    }

    /**
     * 开始同步定时器
     */
    startSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            this.syncConfig();
        }, this.options.syncInterval);
    }

    /**
     * 停止同步定时器
     */
    stopSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    /**
     * 同步配置
     */
    async syncConfig() {
        try {
            if (this.isDirty && !this.isSaving) {
                await this.saveConfig(true);
                this.emit('configSynced');
            }
        } catch (error) {
            console.error('同步配置失败:', error);
        }
    }

    /**
     * 设置页面卸载处理器
     */
    setupPageUnloadHandler() {
        const handleBeforeUnload = (event) => {
            if (this.isDirty && !this.isSaving) {
                event.preventDefault();
                event.returnValue = '有未保存的配置更改，确定要离开吗？';
                return event.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // 页面隐藏时自动保存
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isDirty) {
                this.saveConfig(true);
            }
        });
    }

    /**
     * 添加到变更历史
     * @param {Object} change - 变更记录
     */
    addToChangeHistory(change) {
        this.changeHistory.unshift(change);

        if (this.changeHistory.length > this.maxHistorySize) {
            this.changeHistory = this.changeHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * 获取变更历史
     * @param {number} limit - 限制数量
     * @returns {Array} 变更历史
     */
    getChangeHistory(limit = 50) {
        return this.changeHistory.slice(0, limit);
    }

    /**
     * 计算配置校验和
     * @param {Object} config - 配置对象
     * @returns {Promise<string>} 校验和
     */
    async calculateChecksum(config) {
        const configString = JSON.stringify(config, Object.keys(config).sort());
        return await hash(configString);
    }

    /**
     * 同步计算配置校验和
     * @param {Object} config - 配置对象
     * @returns {string} 校验和
     */
    calculateChecksumSync(config) {
        const configString = JSON.stringify(config, Object.keys(config).sort());
        // 简单的同步哈希（仅用于导出元数据）
        let hash = 0;
        for (let i = 0; i < configString.length; i++) {
            const char = configString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 加密配置
     * @param {Object} config - 配置对象
     * @returns {Object} 加密后的配置
     */
    async encryptConfig(config) {
        if (!this.keyManager) {
            return config;
        }

        const configString = JSON.stringify(config);
        const encryptionKey = this.options.encryptionKey || await this.keyManager.getOrCreateMasterKey();

        return {
            encrypted: true,
            data: await this.keyManager.encrypt(configString, encryptionKey),
            algorithm: 'AES-256-GCM'
        };
    }

    /**
     * 解密配置
     * @param {Object} encryptedConfig - 加密的配置对象
     * @returns {Object} 解密后的配置
     */
    async decryptConfig(encryptedConfig) {
        if (!this.keyManager || !encryptedConfig.encrypted) {
            return encryptedConfig;
        }

        const encryptionKey = this.options.encryptionKey || await this.keyManager.getOrCreateMasterKey();
        const decryptedString = await this.keyManager.decrypt(encryptedConfig.data, encryptionKey);

        return JSON.parse(decryptedString);
    }

    /**
     * 验证完整配置
     * @param {Object} config - 配置对象
     * @returns {Object} 验证结果
     */
    validateFullConfig(config) {
        const errors = [];

        for (const [namespace, namespaceConfig] of Object.entries(config)) {
            if (namespace.startsWith('_')) {
                continue; // 跳过元数据
            }

            const validation = this.validateConfig(namespace, namespaceConfig);
            if (!validation.valid) {
                errors.push(...validation.errors.map(e => `${namespace}: ${e}`));
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取默认配置
     * @returns {Object} 默认配置
     */
    getDefaultConfig() {
        const defaultConfig = {};

        for (const [namespace, config] of this.defaultConfigs) {
            defaultConfig[namespace] = { ...config };
        }

        // 添加默认的应用版本
        defaultConfig.app = defaultConfig.app || {};
        defaultConfig.app.version = '1.0.0';

        return defaultConfig;
    }

    /**
     * 与默认配置合并
     */
    mergeWithDefaults() {
        const defaultConfig = this.getDefaultConfig();

        for (const [namespace, defaultNsConfig] of Object.entries(defaultConfig)) {
            if (!this.currentConfig[namespace]) {
                this.currentConfig[namespace] = defaultNsConfig;
            } else {
                this.currentConfig[namespace] = {
                    ...defaultNsConfig,
                    ...this.currentConfig[namespace]
                };
            }
        }
    }

    /**
     * 获取配置统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            namespacesCount: this.currentConfig ? Object.keys(this.currentConfig).length : 0,
            pendingChangesCount: this.pendingChanges.size,
            changeHistoryCount: this.changeHistory.length,
            backupsCount: this.backups.length,
            isDirty: this.isDirty,
            isLoading: this.isLoading,
            isSaving: this.isSaving,
            lastModified: Math.max(...this.changeHistory.map(h => h.timestamp), 0) || null
        };
    }

    /**
     * 设置选项
     * @param {Object} options - 新选项
     */
    setOptions(options) {
        const oldOptions = { ...this.options };
        Object.assign(this.options, options);

        // 重新设置同步定时器
        if (oldOptions.syncInterval !== this.options.syncInterval) {
            this.stopSyncTimer();
            if (this.options.syncInterval > 0) {
                this.startSyncTimer();
            }
        }

        this.emit('optionsUpdated', options);
    }

    /**
     * 销毁配置管理器
     */
    destroy() {
        // 清理定时器
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        // 保存未保存的配置
        if (this.isDirty && !this.isSaving) {
            this.saveConfig(true);
        }

        // 清理数据
        this.schemas.clear();
        this.defaultConfigs.clear();
        this.configVersions.clear();
        this.pendingChanges.clear();
        this.backups = [];
        this.changeHistory = [];

        // 移除事件监听
        this.removeAllListeners();

        console.log('配置管理器已销毁');
    }
}

// 创建默认实例
export const defaultConfigManager = new ConfigManager();

// 导出到全局
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.ConfigManager = ConfigManager;
    window.defaultConfigManager = defaultConfigManager;
}

export default ConfigManager;