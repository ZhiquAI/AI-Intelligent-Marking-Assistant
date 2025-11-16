/**
 * 智学AI - 设置面板组件
 * 集成密钥管理、AI模型配置和安全功能的综合设置界面
 */

import { EventEmitter } from '../utils/event-manager.js';
import { TemplateLoader } from '../utils/template-loader.js';
import { DOMSanitizer } from '../security/dom-sanitizer.js';
import { KeySecurityManager } from '../security/key-manager.js';
import { CSPViolationReporter } from '../security/csp-config.js';
import { MessageValidator } from '../security/message-validator.js';
import { DraggableManager } from './shared/draggable.js';
import { TabManager } from './shared/tab-manager.js';
import { sendBackgroundMessage } from '../utils/messenger.js';
import { safeSetHTML, safeSetText, safeCreateElement } from '../utils/safe-html.js';
import { validateData, escapeHtml } from '../utils/security-utils.js';

export class SettingsPanel extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            draggable: true,
            enableSecurityValidation: true,
            theme: 'auto',
            responsive: true,
            animationDuration: 300,
            ...options
        };

        // 核心组件初始化
        this.templateLoader = new TemplateLoader();
        this.sanitizer = new DOMSanitizer({
            allowedTags: ['div', 'span', 'h1', 'h2', 'h3', 'p', 'a', 'button', 'input', 'select', 'textarea', 'label', 'form', 'ul', 'li', 'strong', 'em', 'code', 'pre', 'br', 'hr'],
            allowedAttributes: ['id', 'class', 'style', 'type', 'name', 'value', 'placeholder', 'data-*', 'href', 'title', 'disabled', 'checked', 'selected']
        });

        this.keyManager = new KeySecurityManager();
        this.cspReporter = new CSPViolationReporter();
        this.messageValidator = new MessageValidator();

        // 状态管理
        this.isVisible = false;
        this.currentTab = 'general';
        this.settings = {
            general: {
                theme: 'auto',
                autoSave: true,
                language: 'zh-CN',
                notifications: true
            },
            ai: {
                defaultProvider: 'openai',
                temperature: 0.7,
                maxTokens: 4000,
                timeout: 30000
            },
            security: {
                enableLogging: true,
                keyRotationDays: 90,
                sessionTimeout: 3600000,
                enforceCSP: true
            },
            ui: {
                compactMode: false,
                showTooltips: true,
                animationSpeed: 'normal',
                position: 'top-right'
            }
        };

        // 缓存DOM元素
        this.elements = {};

        // 初始化
        this.init();
    }

    async init() {
        try {
            console.log('设置面板初始化中...');

            // 加载设置
            await this.loadSettings();

            // 设置安全验证
            if (this.options.enableSecurityValidation) {
                this.setupSecurityValidation();
            }

            console.log('设置面板初始化完成');
            this.emit('initialized');

        } catch (error) {
            console.error('设置面板初始化失败:', error);
            this.emit('error', error);
        }
    }

    async createPanel() {
        try {
            // 加载模板
            const templateData = await this.templateLoader.load('settings-panel', this.getTemplateData());

            // 创建容器
            this.container = safeCreateElement('div', {
                id: 'zhixue-settings-panel',
                className: `zhixue-settings-panel ${this.options.theme}`,
                style: {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: '2147483647',
                    opacity: '0',
                    transition: `opacity ${this.options.animationDuration}ms ease-in-out`,
                    pointerEvents: 'none'
                }
            }, templateData.html);

            // 添加到页面
            document.body.appendChild(this.container);

            // 缓存DOM元素
            this.cacheElements();

            // 设置事件监听
            this.setupEventListeners();

            // 初始化标签页管理
            this.initTabManager();

            // 初始化拖拽功能
            if (this.options.draggable) {
                this.initDraggable();
            }

            // 绑定设置项
            this.bindSettings();

            // 初始化安全组件
            await this.initSecurityComponents();

            // 设置主题
            this.setTheme(this.options.theme);

            console.log('设置面板创建完成');
            return this.container;

        } catch (error) {
            console.error('设置面板创建失败:', error);
            throw error;
        }
    }

    async loadSettings() {
        try {
            // 从存储加载设置
            const result = await sendBackgroundMessage('storage.get', ['settings']);
            if (result && typeof result === 'object') {
                // 合并设置，保留默认值
                this.settings = this.mergeSettings(this.settings, result);
            }

            // 加载AI提供商配置
            const providersResult = await sendBackgroundMessage('storage.get', ['aiProviders']);
            if (providersResult && Array.isArray(providersResult)) {
                this.aiProviders = providersResult;
            } else {
                this.aiProviders = [
                    { id: 'openai', name: 'OpenAI GPT', enabled: true, models: ['gpt-4o', 'gpt-4'] },
                    { id: 'gemini', name: 'Google Gemini', enabled: true, models: ['gemini-pro', 'gemini-pro-vision'] },
                    { id: 'qwen', name: '阿里云通义千问', enabled: true, models: ['qwen-max', 'qwen-plus'] },
                    { id: 'zhipuai', name: '智谱AI', enabled: true, models: ['glm-4v', 'glm-3-turbo'] }
                ];
            }

            // 加载安全配置
            const securityResult = await sendBackgroundMessage('storage.get', ['securityConfig']);
            if (securityResult) {
                this.securityConfig = securityResult;
            }

        } catch (error) {
            console.error('加载设置失败:', error);
            // 使用默认设置
        }
    }

    async saveSettings() {
        try {
            // 验证设置数据
            const validation = validateData(this.settings, 'object');
            if (!validation.valid) {
                throw new Error(`设置数据验证失败: ${validation.error}`);
            }

            // 保存到存储
            await sendBackgroundMessage('storage.set', {
                settings: this.settings,
                aiProviders: this.aiProviders,
                securityConfig: this.securityConfig,
                lastUpdated: Date.now()
            });

            this.emit('settingsSaved', this.settings);
            console.log('设置保存成功');

        } catch (error) {
            console.error('保存设置失败:', error);
            this.emit('error', error);
            throw error;
        }
    }

    mergeSettings(defaultSettings, loadedSettings) {
        const merged = JSON.parse(JSON.stringify(defaultSettings));

        function mergeDeep(target, source) {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    mergeDeep(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }

        mergeDeep(merged, loadedSettings);
        return merged;
    }

    cacheElements() {
        const selectors = [
            'panel', 'header', 'title', 'closeBtn', 'tabContainer', 'contentContainer',
            'generalTab', 'aiTab', 'securityTab', 'uiTab', 'aboutTab',
            'generalContent', 'aiContent', 'securityContent', 'uiContent', 'aboutContent',
            'saveBtn', 'resetBtn', 'cancelBtn', 'keyManagementBtn'
        ];

        selectors.forEach(selector => {
            const element = this.container.querySelector(`[data-ref="${selector}"]`);
            if (element) {
                this.elements[selector] = element;
            }
        });
    }

    setupEventListeners() {
        // 关闭按钮
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.hide());
        }

        // 保存按钮
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => this.handleSave());
        }

        // 重置按钮
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.handleReset());
        }

        // 取消按钮
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener('click', () => this.hide());
        }

        // 密钥管理按钮
        if (this.elements.keyManagementBtn) {
            this.elements.keyManagementBtn.addEventListener('click', () => this.showKeyManagement());
        }

        // 标签页切换
        const tabButtons = this.container.querySelectorAll('[data-tab]');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 设置项变更监听
        this.container.addEventListener('change', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.handleSettingChange(e);
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });
    }

    initTabManager() {
        this.tabManager = new TabManager(this.container, {
            tabSelector: '[data-tab]',
            contentSelector: '[data-content]',
            activeClass: 'active'
        });

        // 设置默认标签
        this.tabManager.activate(this.currentTab);
    }

    initDraggable() {
        const header = this.elements.header;
        if (header) {
            this.draggable = new DraggableManager(this.container, {
                handle: header,
                containment: 'viewport',
                onDragStart: (pos) => {
                    this.container.style.cursor = 'grabbing';
                    this.emit('dragStart', pos);
                },
                onDrag: (pos) => {
                    this.emit('drag', pos);
                },
                onDragEnd: (pos) => {
                    this.container.style.cursor = '';
                    this.emit('dragEnd', pos);
                }
            });
        }
    }

    async initSecurityComponents() {
        try {
            // CSP违规检查
            const cspStatus = await this.cspReporter.checkSecurity();
            this.updateSecurityStatus('csp', cspStatus);

            // 消息验证器状态
            const messageValidation = await this.messageValidator.getValidationStatus();
            this.updateSecurityStatus('messaging', messageValidation);

            // 密钥管理器状态
            const keyStatus = await this.keyManager.getSecurityStatus();
            this.updateSecurityStatus('keyManagement', keyStatus);

        } catch (error) {
            console.error('初始化安全组件失败:', error);
        }
    }

    bindSettings() {
        // 绑定常规设置
        this.bindSettingGroup('general', {
            theme: this.container.querySelector('[data-setting="general.theme"]'),
            autoSave: this.container.querySelector('[data-setting="general.autoSave"]'),
            language: this.container.querySelector('[data-setting="general.language"]'),
            notifications: this.container.querySelector('[data-setting="general.notifications"]')
        });

        // 绑定AI设置
        this.bindSettingGroup('ai', {
            defaultProvider: this.container.querySelector('[data-setting="ai.defaultProvider"]'),
            temperature: this.container.querySelector('[data-setting="ai.temperature"]'),
            maxTokens: this.container.querySelector('[data-setting="ai.maxTokens"]'),
            timeout: this.container.querySelector('[data-setting="ai.timeout"]')
        });

        // 绑定安全设置
        this.bindSettingGroup('security', {
            enableLogging: this.container.querySelector('[data-setting="security.enableLogging"]'),
            keyRotationDays: this.container.querySelector('[data-setting="security.keyRotationDays"]'),
            sessionTimeout: this.container.querySelector('[data-setting="security.sessionTimeout"]'),
            enforceCSP: this.container.querySelector('[data-setting="security.enforceCSP"]')
        });

        // 绑定UI设置
        this.bindSettingGroup('ui', {
            compactMode: this.container.querySelector('[data-setting="ui.compactMode"]'),
            showTooltips: this.container.querySelector('[data-setting="ui.showTooltips"]'),
            animationSpeed: this.container.querySelector('[data-setting="ui.animationSpeed"]'),
            position: this.container.querySelector('[data-setting="ui.position"]')
        });
    }

    bindSettingGroup(group, elements) {
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) return;

            const [groupKey, settingKey] = key.split('.');
            const value = this.getSettingValue(groupKey, settingKey);

            if (element.type === 'checkbox') {
                element.checked = value;
            } else if (element.type === 'radio') {
                element.checked = element.value === String(value);
            } else if (element.tagName === 'SELECT') {
                element.value = String(value);
            } else {
                element.value = value;
            }
        });
    }

    getSettingValue(group, key) {
        const path = key.split('.');
        let value = this.settings[group];

        for (const part of path) {
            value = value?.[part];
        }

        return value;
    }

    handleSettingChange(event) {
        const element = event.target;
        const settingPath = element.dataset.setting;

        if (!settingPath) return;

        const [group, ...keys] = settingPath.split('.');
        const key = keys.join('.');

        let value;
        if (element.type === 'checkbox') {
            value = element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
            value = parseFloat(element.value) || 0;
        } else {
            value = element.value;
        }

        this.setSettingValue(group, key, value);
        this.emit('settingChanged', { group, key, value });
    }

    setSettingValue(group, key, value) {
        if (!this.settings[group]) {
            this.settings[group] = {};
        }

        const keys = key.split('.');
        let current = this.settings[group];

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    async handleSave() {
        try {
            // 显示保存状态
            this.showSaveStatus('saving');

            // 保存设置
            await this.saveSettings();

            // 应用设置
            await this.applySettings();

            // 显示成功状态
            this.showSaveStatus('success');

            setTimeout(() => {
                this.hide();
            }, 1500);

        } catch (error) {
            console.error('保存设置失败:', error);
            this.showSaveStatus('error', error.message);
        }
    }

    async handleReset() {
        if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
            try {
                // 重置为默认设置
                this.settings = {
                    general: {
                        theme: 'auto',
                        autoSave: true,
                        language: 'zh-CN',
                        notifications: true
                    },
                    ai: {
                        defaultProvider: 'openai',
                        temperature: 0.7,
                        maxTokens: 4000,
                        timeout: 30000
                    },
                    security: {
                        enableLogging: true,
                        keyRotationDays: 90,
                        sessionTimeout: 3600000,
                        enforceCSP: true
                    },
                    ui: {
                        compactMode: false,
                        showTooltips: true,
                        animationSpeed: 'normal',
                        position: 'top-right'
                    }
                };

                // 重新绑定设置
                this.bindSettings();

                // 保存重置后的设置
                await this.saveSettings();

                // 显示成功消息
                this.showSaveStatus('reset');

            } catch (error) {
                console.error('重置设置失败:', error);
                this.showSaveStatus('error', error.message);
            }
        }
    }

    async applySettings() {
        try {
            // 应用主题
            if (this.settings.general.theme !== 'auto') {
                document.documentElement.setAttribute('data-theme', this.settings.general.theme);
            } else {
                document.documentElement.removeAttribute('data-theme');
            }

            // 应用语言设置
            if (this.settings.general.language) {
                document.documentElement.lang = this.settings.general.language;
            }

            // 应用UI设置
            if (this.settings.ui.compactMode) {
                document.body.classList.add('compact-mode');
            } else {
                document.body.classList.remove('compact-mode');
            }

            // 通知其他组件设置已更新
            this.emit('settingsApplied', this.settings);

        } catch (error) {
            console.error('应用设置失败:', error);
        }
    }

    showSaveStatus(status, message = '') {
        const statusElement = this.container.querySelector('[data-ref="saveStatus"]');
        if (!statusElement) return;

        const statusMessages = {
            saving: '正在保存...',
            success: '设置已保存',
            error: `保存失败: ${message}`,
            reset: '设置已重置'
        };

        statusElement.className = `save-status ${status}`;
        statusElement.textContent = statusMessages[status] || '';

        if (status === 'success' || status === 'reset') {
            setTimeout(() => {
                statusElement.className = 'save-status';
                statusElement.textContent = '';
            }, 3000);
        }
    }

    updateSecurityStatus(component, status) {
        const statusElement = this.container.querySelector(`[data-security-status="${component}"]`);
        if (!statusElement) return;

        statusElement.className = `security-status ${status.level}`;
        statusElement.textContent = status.message;

        if (status.details) {
            statusElement.title = status.details;
        }
    }

    switchTab(tabName) {
        if (this.tabManager) {
            this.tabManager.activate(tabName);
            this.currentTab = tabName;
            this.emit('tabChanged', tabName);
        }
    }

    setTheme(theme) {
        this.container.setAttribute('data-theme', theme);
        this.options.theme = theme;
    }

    async show() {
        if (this.isVisible) return;

        try {
            // 创建面板（如果尚未创建）
            if (!this.container) {
                await this.createPanel();
            }

            // 刷新设置状态
            await this.refreshStatus();

            // 显示动画
            this.container.style.opacity = '1';
            this.container.style.pointerEvents = '';

            this.isVisible = true;
            this.emit('shown');

        } catch (error) {
            console.error('显示设置面板失败:', error);
            this.emit('error', error);
        }
    }

    hide() {
        if (!this.isVisible) return;

        // 隐藏动画
        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';

        setTimeout(() => {
            this.isVisible = false;
            this.emit('hidden');
        }, this.options.animationDuration);
    }

    async refreshStatus() {
        try {
            // 刷新安全状态
            await this.initSecurityComponents();

            // 刷新AI提供商状态
            await this.refreshProviderStatus();

        } catch (error) {
            console.error('刷新状态失败:', error);
        }
    }

    async refreshProviderStatus() {
        try {
            const providerStatus = await sendBackgroundMessage('ai.getProviders');
            if (providerStatus) {
                this.updateProviderStatus(providerStatus);
            }
        } catch (error) {
            console.error('刷新提供商状态失败:', error);
        }
    }

    updateProviderStatus(providers) {
        providers.forEach(provider => {
            const statusElement = this.container.querySelector(`[data-provider-status="${provider.id}"]`);
            if (statusElement) {
                statusElement.className = `provider-status ${provider.status}`;
                statusElement.textContent = provider.statusText || provider.status;
            }
        });
    }

    showKeyManagement() {
        // 触发密钥管理事件
        this.emit('showKeyManagement');
    }

    getTemplateData() {
        return {
            settings: this.settings,
            aiProviders: this.aiProviders,
            theme: this.options.theme,
            securityConfig: this.securityConfig || {},
            version: chrome?.runtime?.getManifest?.()?.version || '1.0.0'
        };
    }

    setupSecurityValidation() {
        // 添加CSP违规监听
        this.cspReporter.on('violation', (violation) => {
            console.warn('CSP违规检测:', violation);
            this.emit('securityViolation', violation);
        });

        // 添加消息验证监听
        this.messageValidator.on('validationFailed', (error) => {
            console.error('消息验证失败:', error);
            this.emit('securityError', error);
        });
    }

    destroy() {
        // 移除事件监听
        this.removeAllListeners();

        // 销毁子组件
        if (this.tabManager) {
            this.tabManager.destroy();
        }

        if (this.draggable) {
            this.draggable.destroy();
        }

        // 移除DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // 清理引用
        this.container = null;
        this.elements = {};
        this.settings = null;

        console.log('设置面板已销毁');
    }
}

// 创建默认实例
export const defaultSettingsPanel = new SettingsPanel();

// 导出到全局
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.SettingsPanel = SettingsPanel;
    window.defaultSettingsPanel = defaultSettingsPanel;
}

export default SettingsPanel;