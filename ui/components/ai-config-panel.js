/**
 * 智学AI - AI模型配置面板
 * 提供全面的AI模型配置、测试和管理功能
 */

import { EventEmitter } from '../utils/event-manager.js';
import { TemplateLoader } from '../utils/template-loader.js';
import { safeSetHTML, safeSetText, safeCreateElement } from '../utils/safe-html.js';
import { validateData, escapeHtml, generateSecureId } from '../utils/security-utils.js';
import { sendBackgroundMessage } from '../utils/messenger.js';
import { defaultStatusIndicator } from './status-indicator.js';

export class AIConfigPanel extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            enableTestMode: true,
            enableAutoSave: true,
            showAdvancedOptions: false,
            testTimeout: 30000,
            autoDetectModels: true,
            cacheModels: true,
            ...options
        };

        // 核心组件
        this.templateLoader = new TemplateLoader();

        // 数据管理
        this.providers = new Map();
        this.models = new Map();
        this.currentProvider = null;
        this.currentModel = null;
        this.configHistory = [];
        this.testResults = new Map();

        // 状态管理
        this.isVisible = false;
        this.isTesting = false;
        this.hasUnsavedChanges = false;

        // 缓存DOM元素
        this.container = null;
        this.elements = {};

        // 初始化
        this.init();
    }

    async init() {
        try {
            console.log('AI配置面板初始化中...');

            // 加载默认提供商
            await this.loadDefaultProviders();

            // 创建界面
            await this.createPanel();

            // 设置事件监听
            this.setupEventListeners();

            // 加载保存的配置
            await this.loadSavedConfig();

            console.log('AI配置面板初始化完成');
            this.emit('initialized');

        } catch (error) {
            console.error('AI配置面板初始化失败:', error);
            this.emit('error', error);
        }
    }

    async loadDefaultProviders() {
        const defaultProviders = [
            {
                id: 'openai',
                name: 'OpenAI',
                description: 'GPT-4o, GPT-4, GPT-3.5 Turbo',
                baseUrl: 'https://api.openai.com/v1',
                models: [
                    { id: 'gpt-4o', name: 'GPT-4o', description: '最新的多模态模型', maxTokens: 128000, supportsVision: true },
                    { id: 'gpt-4', name: 'GPT-4', description: '强大的语言模型', maxTokens: 8192, supportsVision: false },
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速响应模型', maxTokens: 4096, supportsVision: false }
                ],
                features: ['text', 'vision', 'function_calling'],
                pricing: { input: 0.005, output: 0.015, unit: '1K tokens' }
            },
            {
                id: 'gemini',
                name: 'Google Gemini',
                description: 'Gemini Pro, Gemini Pro Vision',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                models: [
                    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google最新语言模型', maxTokens: 32768, supportsVision: false },
                    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', description: '多模态视觉模型', maxTokens: 16384, supportsVision: true }
                ],
                features: ['text', 'vision', 'multimodal'],
                pricing: { input: 0.0005, output: 0.0015, unit: '1K characters' }
            },
            {
                id: 'qwen',
                name: '阿里云通义千问',
                description: 'Qwen-Max, Qwen-Plus, Qwen-Turbo',
                baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
                models: [
                    { id: 'qwen-max', name: 'Qwen-Max', description: '旗舰级大模型', maxTokens: 8000, supportsVision: false },
                    { id: 'qwen-plus', name: 'Qwen-Plus', description: '高性能模型', maxTokens: 6000, supportsVision: false },
                    { id: 'qwen-turbo', name: 'Qwen-Turbo', description: '快速响应模型', maxTokens: 3000, supportsVision: false }
                ],
                features: ['text', 'chinese_optimized'],
                pricing: { input: 0.02, output: 0.06, unit: '1K tokens' }
            },
            {
                id: 'zhipuai',
                name: '智谱AI',
                description: 'GLM-4V, GLM-3-Turbo',
                baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
                models: [
                    { id: 'glm-4v', name: 'GLM-4V', description: '视觉理解模型', maxTokens: 128000, supportsVision: true },
                    { id: 'glm-3-turbo', name: 'GLM-3-Turbo', description: '高效推理模型', maxTokens: 128000, supportsVision: false }
                ],
                features: ['text', 'vision', 'tool_use'],
                pricing: { input: 0.1, output: 0.1, unit: '1K tokens' }
            }
        ];

        // 加载到映射中
        defaultProviders.forEach(provider => {
            this.providers.set(provider.id, {
                ...provider,
                enabled: true,
                configured: false,
                testStatus: 'unknown'
            });
        });

        // 发射提供商加载事件
        this.emit('providersLoaded', Array.from(this.providers.values()));
    }

    async createPanel() {
        try {
            // 创建主容器
            this.container = safeCreateElement('div', {
                id: 'zhixue-ai-config-panel',
                className: 'zhixue-ai-config-panel',
                style: {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '2147483646',
                    opacity: '0',
                    transition: 'opacity 300ms ease-in-out',
                    pointerEvents: 'none'
                }
            });

            // 创建内容结构
            this.createPanelStructure();

            // 添加到页面
            document.body.appendChild(this.container);

            // 缓存DOM元素
            this.cacheElements();

            console.log('AI配置面板创建完成');
            return this.container;

        } catch (error) {
            console.error('创建AI配置面板失败:', error);
            throw error;
        }
    }

    createPanelStructure() {
        const panelHTML = `
            <div class="ai-config-header">
                <div class="header-left">
                    <h2 class="panel-title">
                        <span class="icon">🤖</span>
                        AI模型配置
                    </h2>
                </div>
                <div class="header-right">
                    <button class="btn btn-ghost" data-action="test-all" title="测试所有配置">
                        <span class="icon">🧪</span>
                        测试全部
                    </button>
                    <button class="btn btn-ghost" data-action="refresh" title="刷新模型列表">
                        <span class="icon">🔄</span>
                        刷新
                    </button>
                    <button class="btn btn-ghost close-btn" data-action="close" title="关闭">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>

            <div class="ai-config-body">
                <div class="provider-list">
                    <div class="list-header">
                        <h3>AI服务提供商</h3>
                        <div class="list-actions">
                            <button class="btn btn-outline btn-sm" data-action="add-provider">
                                <span class="icon">+</span>
                                添加提供商
                            </button>
                        </div>
                    </div>
                    <div class="providers-container" data-ref="providersContainer">
                        <!-- 动态生成提供商卡片 -->
                    </div>
                </div>

                <div class="model-config">
                    <div class="config-header">
                        <h3>模型配置</h3>
                        <div class="config-actions">
                            <button class="btn btn-outline btn-sm" data-action="toggle-advanced">
                                <span class="icon">⚙️</span>
                                高级选项
                            </button>
                        </div>
                    </div>
                    <div class="config-content" data-ref="configContent">
                        <div class="no-selection">
                            <p>请选择一个AI提供商开始配置</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="ai-config-footer">
                <div class="footer-left">
                    <div class="config-status" data-ref="configStatus">
                        <span class="status-indicator" data-status="default"></span>
                        <span class="status-text">就绪</span>
                    </div>
                </div>
                <div class="footer-right">
                    <button class="btn btn-outline" data-action="reset">重置</button>
                    <button class="btn btn-outline" data-action="cancel">取消</button>
                    <button class="btn btn-primary" data-action="save" disabled>保存配置</button>
                </div>
            </div>
        `;

        safeSetHTML(this.container, panelHTML);
    }

    async loadSavedConfig() {
        try {
            const result = await sendBackgroundMessage('storage.get', ['aiConfig']);
            if (result && typeof result === 'object') {
                // 应用保存的配置
                Object.entries(result).forEach(([providerId, config]) => {
                    const provider = this.providers.get(providerId);
                    if (provider) {
                        Object.assign(provider, config);
                    }
                });
            }

            // 重新渲染提供商列表
            this.renderProviders();

        } catch (error) {
            console.error('加载保存的配置失败:', error);
        }
    }

    renderProviders() {
        const container = this.elements.providersContainer;
        if (!container) return;

        container.innerHTML = '';

        this.providers.forEach(provider => {
            const providerCard = this.createProviderCard(provider);
            container.appendChild(providerCard);
        });
    }

    createProviderCard(provider) {
        const card = safeCreateElement('div', {
            className: `provider-card ${provider.enabled ? 'enabled' : 'disabled'} ${provider.configured ? 'configured' : ''}`,
            'data-provider-id': provider.id
        });

        const cardHTML = `
            <div class="provider-header">
                <div class="provider-info">
                    <h4 class="provider-name">${escapeHtml(provider.name)}</h4>
                    <p class="provider-desc">${escapeHtml(provider.description)}</p>
                </div>
                <div class="provider-status">
                    <span class="status-dot ${provider.testStatus}"></span>
                    <span class="status-text">${this.getStatusText(provider.testStatus)}</span>
                </div>
            </div>

            <div class="provider-models">
                <div class="models-header">
                    <span class="models-count">${provider.models?.length || 0} 个模型</span>
                    <button class="btn btn-ghost btn-xs" data-action="load-models" data-provider="${provider.id}">
                        <span class="icon">📋</span>
                    </button>
                </div>
                <div class="models-list">
                    ${provider.models?.map(model => `
                        <div class="model-item ${model.supportsVision ? 'supports-vision' : ''}" data-model-id="${model.id}">
                            <span class="model-name">${escapeHtml(model.name)}</span>
                            ${model.supportsVision ? '<span class="model-badge">👁️</span>' : ''}
                        </div>
                    `).join('') || '<p class="no-models">暂无模型</p>'}
                </div>
            </div>

            <div class="provider-actions">
                <label class="switch">
                    <input type="checkbox" ${provider.enabled ? 'checked' : ''} data-action="toggle-provider" data-provider="${provider.id}">
                    <span class="slider"></span>
                </label>
                <button class="btn btn-outline btn-sm" data-action="configure" data-provider="${provider.id}">
                    配置
                </button>
                <button class="btn btn-ghost btn-sm" data-action="test" data-provider="${provider.id}">
                    测试
                </button>
            </div>
        `;

        safeSetHTML(card, cardHTML);
        return card;
    }

    getStatusText(status) {
        const statusMap = {
            'unknown': '未知',
            'testing': '测试中',
            'success': '正常',
            'error': '错误',
            'disabled': '已禁用'
        };
        return statusMap[status] || '未知';
    }

    async configureProvider(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) return;

        this.currentProvider = providerId;
        this.renderModelConfig(provider);
    }

    renderModelConfig(provider) {
        const configContent = this.elements.configContent;
        if (!configContent) return;

        const configHTML = `
            <div class="config-form">
                <div class="form-section">
                    <h4>基本配置</h4>
                    <div class="form-group">
                        <label for="api-key-${provider.id}">API密钥</label>
                        <div class="input-group">
                            <input type="password" id="api-key-${provider.id}" class="form-control" placeholder="请输入API密钥" data-field="apiKey">
                            <button class="btn btn-ghost btn-sm" data-action="toggle-visibility" data-input="api-key-${provider.id}">
                                <span class="icon">👁️</span>
                            </button>
                        </div>
                    </div>

                    ${provider.baseUrl ? `
                    <div class="form-group">
                        <label for="base-url-${provider.id}">API基础URL</label>
                        <input type="url" id="base-url-${provider.id}" class="form-control" value="${provider.baseUrl}" data-field="baseUrl" placeholder="API基础URL">
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label for="model-${provider.id}">选择模型</label>
                        <select id="model-${provider.id}" class="form-control" data-field="modelId">
                            ${provider.models?.map(model => `
                                <option value="${model.id}" ${provider.currentModel === model.id ? 'selected' : ''}>
                                    ${escapeHtml(model.name)} - ${escapeHtml(model.description)}
                                </option>
                            `).join('') || '<option value="">暂无可用模型</option>'}
                        </select>
                    </div>
                </div>

                <div class="form-section advanced-options ${this.options.showAdvancedOptions ? 'visible' : ''}">
                    <h4>高级选项</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="temperature-${provider.id}">Temperature</label>
                            <div class="input-with-slider">
                                <input type="range" id="temperature-${provider.id}" class="form-slider" min="0" max="2" step="0.1" value="${provider.temperature || 0.7}" data-field="temperature">
                                <span class="slider-value">${provider.temperature || 0.7}</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="max-tokens-${provider.id}">最大Tokens</label>
                            <input type="number" id="max-tokens-${provider.id}" class="form-control" value="${provider.maxTokens || 4000}" data-field="maxTokens" min="1" max="128000">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="timeout-${provider.id}">请求超时 (秒)</label>
                            <input type="number" id="timeout-${provider.id}" class="form-control" value="${(provider.timeout || 30000) / 1000}" data-field="timeout" min="5" max="300">
                        </div>

                        <div class="form-group">
                            <label for="retry-count-${provider.id}">重试次数</label>
                            <input type="number" id="retry-count-${provider.id}" class="form-control" value="${provider.retryCount || 3}" data-field="retryCount" min="0" max="10">
                        </div>
                    </div>
                </div>

                ${provider.features?.includes('vision') ? `
                <div class="form-section">
                    <h4>视觉功能</h4>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" ${provider.enableVision ? 'checked' : ''} data-field="enableVision">
                            <span class="checkmark"></span>
                            启用图像识别功能
                        </label>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        safeSetHTML(configContent, configHTML);
        this.setupFormEvents();
    }

    async testProvider(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) return;

        const statusIndicator = this.container.querySelector(`.provider-card[data-provider-id="${providerId}"] .status-dot`);
        const statusText = this.container.querySelector(`.provider-card[data-provider-id="${providerId}"] .status-text`);

        try {
            // 更新状态为测试中
            provider.testStatus = 'testing';
            statusIndicator.className = 'status-dot testing';
            statusText.textContent = '测试中';

            // 显示测试通知
            const notificationId = defaultStatusIndicator.showNotification({
                type: 'info',
                message: `正在测试 ${provider.name} 连接...`,
                duration: 0
            });

            // 发送测试请求到后台
            const testResult = await sendBackgroundMessage('ai.testProvider', {
                providerId,
                config: {
                    apiKey: provider.apiKey,
                    baseUrl: provider.baseUrl,
                    modelId: provider.currentModel || provider.models?.[0]?.id,
                    timeout: provider.timeout || 30000
                }
            });

            // 隐藏测试通知
            defaultStatusIndicator.hideNotification(notificationId);

            if (testResult.success) {
                // 测试成功
                provider.testStatus = 'success';
                provider.configured = true;

                statusIndicator.className = 'status-dot success';
                statusText.textContent = '连接正常';

                defaultStatusIndicator.showNotification({
                    type: 'success',
                    message: `${provider.name} 连接测试成功！`,
                    title: '测试通过'
                });

                // 保存测试结果
                this.testResults.set(providerId, {
                    success: true,
                    latency: testResult.latency,
                    timestamp: Date.now(),
                    model: testResult.model
                });

            } else {
                // 测试失败
                provider.testStatus = 'error';
                statusIndicator.className = 'status-dot error';
                statusText.textContent = '连接失败';

                defaultStatusIndicator.showNotification({
                    type: 'error',
                    message: `${provider.name} 连接测试失败: ${testResult.error}`,
                    title: '测试失败'
                });

                // 保存错误结果
                this.testResults.set(providerId, {
                    success: false,
                    error: testResult.error,
                    timestamp: Date.now()
                });
            }

            this.emit('providerTested', {
                providerId,
                success: testResult.success,
                result: testResult
            });

        } catch (error) {
            console.error(`测试提供商 ${providerId} 失败:`, error);

            provider.testStatus = 'error';
            statusIndicator.className = 'status-dot error';
            statusText.textContent = '测试异常';

            defaultStatusIndicator.showNotification({
                type: 'error',
                message: `测试 ${provider.name} 时发生异常: ${error.message}`,
                title: '测试异常'
            });
        }
    }

    async testAllProviders() {
        const enabledProviders = Array.from(this.providers.values())
            .filter(p => p.enabled);

        if (enabledProviders.length === 0) {
            defaultStatusIndicator.showNotification({
                type: 'warning',
                message: '没有启用的AI提供商可供测试',
                title: '无法测试'
            });
            return;
        }

        const testNotificationId = defaultStatusIndicator.showNotification({
            type: 'info',
            message: `正在测试 ${enabledProviders.length} 个AI提供商...`,
            duration: 0
        });

        let successCount = 0;
        let failCount = 0;

        // 并发测试所有提供商
        const testPromises = enabledProviders.map(async provider => {
            try {
                await this.testProvider(provider.id);
                if (this.providers.get(provider.id).testStatus === 'success') {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
                console.error(`测试提供商 ${provider.id} 失败:`, error);
            }
        });

        await Promise.all(testPromises);

        // 隐藏测试通知
        defaultStatusIndicator.hideNotification(testNotificationId);

        // 显示测试结果
        defaultStatusIndicator.showNotification({
            type: successCount === enabledProviders.length ? 'success' : 'warning',
            message: `测试完成: ${successCount} 成功, ${failCount} 失败`,
            title: '批量测试结果'
        });

        this.emit('allProvidersTested', {
            total: enabledProviders.length,
            success: successCount,
            failed: failCount
        });
    }

    async saveConfig() {
        try {
            // 验证配置
            const validation = this.validateConfig();
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // 准备配置数据
            const configData = {};
            this.providers.forEach((provider, id) => {
                configData[id] = {
                    enabled: provider.enabled,
                    apiKey: provider.apiKey,
                    baseUrl: provider.baseUrl,
                    currentModel: provider.currentModel,
                    temperature: provider.temperature,
                    maxTokens: provider.maxTokens,
                    timeout: provider.timeout,
                    retryCount: provider.retryCount,
                    enableVision: provider.enableVision,
                    testStatus: provider.testStatus,
                    configured: provider.configured
                };
            });

            // 保存到存储
            await sendBackgroundMessage('storage.set', {
                aiConfig: configData,
                lastUpdated: Date.now()
            });

            // 更新状态
            this.hasUnsavedChanges = false;
            this.updateSaveButton(false);

            defaultStatusIndicator.showNotification({
                type: 'success',
                message: 'AI配置已成功保存',
                title: '保存成功'
            });

            this.emit('configSaved', configData);

        } catch (error) {
            console.error('保存配置失败:', error);
            defaultStatusIndicator.showNotification({
                type: 'error',
                message: `保存配置失败: ${error.message}`,
                title: '保存失败'
            });
            throw error;
        }
    }

    validateConfig() {
        const errors = [];

        this.providers.forEach((provider, id) => {
            if (provider.enabled) {
                if (!provider.apiKey) {
                    errors.push(`${provider.name}: 缺少API密钥`);
                }
                if (!provider.currentModel && provider.models?.length > 0) {
                    errors.push(`${provider.name}: 未选择模型`);
                }
            }
        });

        if (errors.length > 0) {
            return {
                valid: false,
                error: errors.join('; ')
            };
        }

        return { valid: true };
    }

    setupEventListeners() {
        // 面板按钮事件
        this.container.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]');
            if (!action) return;

            event.preventDefault();

            switch (action.dataset.action) {
                case 'close':
                    this.hide();
                    break;
                case 'test':
                    this.testProvider(action.dataset.provider);
                    break;
                case 'test-all':
                    this.testAllProviders();
                    break;
                case 'configure':
                    this.configureProvider(action.dataset.provider);
                    break;
                case 'toggle-provider':
                    this.toggleProvider(action.dataset.provider, action.checked);
                    break;
                case 'toggle-advanced':
                    this.toggleAdvancedOptions();
                    break;
                case 'save':
                    this.saveConfig();
                    break;
                case 'reset':
                    this.resetConfig();
                    break;
                case 'cancel':
                    this.hide();
                    break;
                case 'refresh':
                    this.refreshProviders();
                    break;
                case 'toggle-visibility':
                    this.togglePasswordVisibility(action.dataset.input);
                    break;
                case 'load-models':
                    this.loadProviderModels(action.dataset.provider);
                    break;
            }
        });

        // 配置变更事件
        this.container.addEventListener('change', (event) => {
            if (event.target.matches('[data-field]')) {
                this.handleConfigChange(event.target);
            }
        });

        // 滑块实时更新
        this.container.addEventListener('input', (event) => {
            if (event.target.matches('.form-slider')) {
                const valueElement = event.target.nextElementSibling;
                if (valueElement && valueElement.classList.contains('slider-value')) {
                    valueElement.textContent = event.target.value;
                }
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (event) => {
            if (this.isVisible) {
                if (event.key === 'Escape') {
                    this.hide();
                } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                    event.preventDefault();
                    if (this.hasUnsavedChanges) {
                        this.saveConfig();
                    }
                }
            }
        });
    }

    setupFormEvents() {
        // 表单事件在setupEventListeners中统一处理
    }

    handleConfigChange(input) {
        const field = input.dataset.field;
        const provider = this.providers.get(this.currentProvider);
        if (!provider) return;

        let value = input.value;
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number') {
            value = parseFloat(value) || 0;
        }

        provider[field] = value;
        this.hasUnsavedChanges = true;
        this.updateSaveButton(true);

        this.emit('configChanged', {
            providerId: this.currentProvider,
            field,
            value
        });
    }

    toggleProvider(providerId, enabled) {
        const provider = this.providers.get(providerId);
        if (provider) {
            provider.enabled = enabled;
            this.hasUnsavedChanges = true;
            this.updateSaveButton(true);

            const card = this.container.querySelector(`.provider-card[data-provider-id="${providerId}"]`);
            if (card) {
                card.classList.toggle('enabled', enabled);
                card.classList.toggle('disabled', !enabled);
            }

            this.emit('providerToggled', { providerId, enabled });
        }
    }

    toggleAdvancedOptions() {
        this.options.showAdvancedOptions = !this.options.showAdvancedOptions;
        const advancedSection = this.container.querySelector('.advanced-options');
        if (advancedSection) {
            advancedSection.classList.toggle('visible', this.options.showAdvancedOptions);
        }
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

    updateSaveButton(hasChanges) {
        const saveBtn = this.container.querySelector('[data-action="save"]');
        if (saveBtn) {
            saveBtn.disabled = !hasChanges;
        }

        // 更新状态指示器
        const statusIndicator = this.elements.configStatus;
        if (statusIndicator) {
            const statusDot = statusIndicator.querySelector('.status-indicator');
            const statusText = statusIndicator.querySelector('.status-text');

            if (hasChanges) {
                statusDot.setAttribute('data-status', 'modified');
                statusText.textContent = '有未保存的更改';
            } else {
                statusDot.setAttribute('data-status', 'saved');
                statusText.textContent = '已保存';
            }
        }
    }

    async show() {
        if (this.isVisible) return;

        this.container.style.opacity = '1';
        this.container.style.pointerEvents = '';
        this.isVisible = true;
        this.emit('shown');
    }

    hide() {
        if (!this.isVisible) return;

        // 检查是否有未保存的更改
        if (this.hasUnsavedChanges) {
            if (!confirm('有未保存的更改，确定要关闭吗？')) {
                return;
            }
        }

        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
        this.isVisible = false;
        this.emit('hidden');
    }

    cacheElements() {
        const selectors = [
            'providersContainer',
            'configContent',
            'configStatus'
        ];

        selectors.forEach(selector => {
            const element = this.container.querySelector(`[data-ref="${selector}"]`);
            if (element) {
                this.elements[selector] = element;
            }
        });
    }

    async refreshProviders() {
        defaultStatusIndicator.showNotification({
            type: 'info',
            message: '正在刷新AI提供商...',
            duration: 1000
        });

        await this.loadDefaultProviders();
        this.renderProviders();

        defaultStatusIndicator.showNotification({
            type: 'success',
            message: 'AI提供商已刷新',
            title: '刷新完成'
        });
    }

    async loadProviderModels(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider || !this.options.autoDetectModels) return;

        try {
            const models = await sendBackgroundMessage('ai.getModels', {
                providerId,
                config: {
                    apiKey: provider.apiKey,
                    baseUrl: provider.baseUrl
                }
            });

            if (models && Array.isArray(models)) {
                provider.models = models;
                this.renderProviders();

                defaultStatusIndicator.showNotification({
                    type: 'success',
                    message: `已加载 ${models.length} 个模型`,
                    title: '模型加载完成'
                });
            }

        } catch (error) {
            console.error(`加载提供商 ${providerId} 模型失败:`, error);
            defaultStatusIndicator.showNotification({
                type: 'warning',
                message: `加载模型失败: ${error.message}`,
                title: '模型加载失败'
            });
        }
    }

    resetConfig() {
        if (confirm('确定要重置所有配置吗？此操作不可撤销。')) {
            // 重置为默认值
            this.providers.forEach(provider => {
                provider.enabled = true;
                provider.configured = false;
                provider.testStatus = 'unknown';
                provider.temperature = 0.7;
                provider.maxTokens = 4000;
                provider.timeout = 30000;
                provider.retryCount = 3;
                provider.enableVision = false;
            });

            this.hasUnsavedChanges = true;
            this.updateSaveButton(true);
            this.renderProviders();

            if (this.currentProvider) {
                this.renderModelConfig(this.providers.get(this.currentProvider));
            }

            defaultStatusIndicator.showNotification({
                type: 'info',
                message: '配置已重置为默认值',
                title: '重置完成'
            });
        }
    }

    destroy() {
        // 移除事件监听
        this.removeAllListeners();

        // 移除DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // 清理数据
        this.providers.clear();
        this.models.clear();
        this.testResults.clear();
        this.configHistory = [];

        // 重置状态
        this.isVisible = false;
        this.hasUnsavedChanges = false;
        this.currentProvider = null;
        this.currentModel = null;

        console.log('AI配置面板已销毁');
    }
}

// 创建默认实例
export const defaultAIConfigPanel = new AIConfigPanel();

// 导出到全局
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.AIConfigPanel = AIConfigPanel;
    window.defaultAIConfigPanel = defaultAIConfigPanel;
}

export default AIConfigPanel;