/**
 * 设置页面脚本
 * 处理API密钥配置、模型选择、参数设置和验证
 * 按照原型设计实现
 */

import { AIService } from '../services/ai-service.js';

class SettingsManager {
    constructor() {
        this.aiService = new AIService();
        this.isInitialized = false;

        // 绑定UI元素
        this.elements = this.initElements();

        // 初始化设置
        this.init();
    }

    /**
     * 初始化UI元素引用
     */
    initElements() {
        return {
            // 关闭按钮
            closeBtn: document.getElementById('closeBtn'),

            // 标签页按钮
            tabButtons: document.querySelectorAll('.settings-tab-btn'),
            tabContents: document.querySelectorAll('.settings-tab-content'),

            // API密钥输入框 (OpenAI)
            openaiEndpoint: document.getElementById('openaiEndpoint'),
            openaiModel: document.getElementById('openaiModel'),
            openaiKey: document.getElementById('openaiKey'),
            openaiStatus: document.getElementById('openaiStatus'),

            // API密钥输入框 (Gemini)
            geminiEndpoint: document.getElementById('geminiEndpoint'),
            geminiModel: document.getElementById('geminiModel'),
            geminiKey: document.getElementById('geminiKey'),
            geminiStatus: document.getElementById('geminiStatus'),

            // API密钥输入框 (GLM)
            glmEndpoint: document.getElementById('glmEndpoint'),
            glmModel: document.getElementById('glmModel'),
            glmKey: document.getElementById('glmKey'),
            glmStatus: document.getElementById('glmStatus'),

            // 测试按钮
            testOpenAI: document.getElementById('testOpenAI'),
            testGemini: document.getElementById('testGemini'),
            testGLM: document.getElementById('testGLM'),

            // 保存按钮
            saveSettings: document.getElementById('saveSettings'),

            // 状态信息
            currentModel: document.getElementById('currentModel'),
            configStatus: document.getElementById('configStatus'),

            // 消息提示
            toast: document.getElementById('toast'),
            toastIcon: document.getElementById('toastIcon'),
            toastMessage: document.getElementById('toastMessage'),

            // GPT-4o参数
            gpt4oTemp: document.getElementById('gpt4o-temp'),
            gpt4oTempValue: document.getElementById('gpt4o-temp-value'),
            gpt4oMaxTokens: document.getElementById('gpt4o-max-tokens'),
            gpt4oMaxTokensValue: document.getElementById('gpt4o-max-tokens-value'),
            gpt4oTopP: document.getElementById('gpt4o-topp'),
            gpt4oTopPValue: document.getElementById('gpt4o-topp-value'),

            // Gemini参数
            geminiTemp: document.getElementById('gemini-temp'),
            geminiTempValue: document.getElementById('gemini-temp-value'),
            geminiMaxTokens: document.getElementById('gemini-max-tokens'),
            geminiMaxTokensValue: document.getElementById('gemini-max-tokens-value'),
            geminiTopK: document.getElementById('gemini-topk'),
            geminiTopKValue: document.getElementById('gemini-topk-value'),

            // GLM参数
            glmTemp: document.getElementById('glm-temp'),
            glmTempValue: document.getElementById('glm-temp-value'),
            glmMaxTokens: document.getElementById('glm-max-tokens'),
            glmMaxTokensValue: document.getElementById('glm-max-tokens-value'),
            glmPenalty: document.getElementById('glm-penalty'),
            glmPenaltyValue: document.getElementById('glm-penalty-value'),

            // 预设配置按钮
            presetConfigBtns: document.querySelectorAll('.preset-config-btn'),

            // 阅卷策略
            gradingStrategyInputs: document.querySelectorAll('input[name="grading-strategy"]'),
            strategyItems: document.querySelectorAll('.strategy-item'),

            // 高级设置
            autoSaveToggle: document.getElementById('autoSaveToggle'),
            debugModeToggle: document.getElementById('debugModeToggle'),
            gradingSpeedSelect: document.getElementById('gradingSpeedSelect')
        };
    }

    /**
     * 初始化设置管理器
     */
    async init() {
        try {
            // 加载已保存的设置
            await this.loadSavedSettings();

            // 绑定事件监听器
            this.bindEvents();

            // 更新状态显示
            this.updateStatus();

            this.isInitialized = true;
            console.log('设置管理器初始化完成');
        } catch (error) {
            console.error('设置管理器初始化失败:', error);
            this.showToast('error', '初始化失败: ' + error.message);
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 关闭按钮
        this.elements.closeBtn.addEventListener('click', () => {
            window.close();
        });

        // 标签页切换
        this.elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-settings-tab');
                this.switchTab(tabName);
            });
        });

        // 保存按钮
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });

        // 测试按钮
        this.elements.testOpenAI.addEventListener('click', () => {
            this.testApiKey('openai');
        });
        this.elements.testGemini.addEventListener('click', () => {
            this.testApiKey('gemini');
        });
        this.elements.testGLM.addEventListener('click', () => {
            this.testApiKey('glm');
        });

        // GPT-4o 参数滑块
        this.elements.gpt4oTemp.addEventListener('input', (e) => {
            this.elements.gpt4oTempValue.textContent = e.target.value;
            this.saveModelParams();
        });
        this.elements.gpt4oMaxTokens.addEventListener('input', (e) => {
            this.elements.gpt4oMaxTokensValue.textContent = e.target.value;
            this.saveModelParams();
        });
        this.elements.gpt4oTopP.addEventListener('input', (e) => {
            this.elements.gpt4oTopPValue.textContent = e.target.value;
            this.saveModelParams();
        });

        // Gemini 参数滑块
        this.elements.geminiTemp.addEventListener('input', (e) => {
            this.elements.geminiTempValue.textContent = e.target.value;
            this.saveModelParams();
        });
        this.elements.geminiMaxTokens.addEventListener('input', (e) => {
            this.elements.geminiMaxTokensValue.textContent = e.target.value;
            this.saveModelParams();
        });
        this.elements.geminiTopK.addEventListener('input', (e) => {
            this.elements.geminiTopKValue.textContent = e.target.value;
            this.saveModelParams();
        });

        // GLM 参数滑块
        this.elements.glmTemp.addEventListener('input', (e) => {
            this.elements.glmTempValue.textContent = e.target.value;
            this.saveModelParams();
        });
        this.elements.glmMaxTokens.addEventListener('input', (e) => {
            this.elements.glmMaxTokensValue.textContent = e.target.value;
            this.saveModelParams();
        });
        this.elements.glmPenalty.addEventListener('input', (e) => {
            this.elements.glmPenaltyValue.textContent = e.target.value;
            this.saveModelParams();
        });

        // 预设配置按钮
        this.elements.presetConfigBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                this.applyPreset(preset);
            });
        });

        // 阅卷策略选择
        this.elements.gradingStrategyInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateStrategyStyles();
            });
        });

        // 高级设置
        this.elements.autoSaveToggle.addEventListener('change', () => {
            this.saveAdvancedSettings();
        });
        this.elements.debugModeToggle.addEventListener('change', () => {
            this.saveAdvancedSettings();
        });
        this.elements.gradingSpeedSelect.addEventListener('change', () => {
            this.saveAdvancedSettings();
        });

        // 输入框回车事件
        const inputs = [
            this.elements.openaiKey,
            this.elements.geminiKey,
            this.elements.glmKey
        ];
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const provider = input.id.replace('Key', '');
                    this.testApiKey(provider);
                }
            });
        });
    }

    /**
     * 标签页切换
     */
    switchTab(tabName) {
        // 更新标签按钮样式
        this.elements.tabButtons.forEach(btn => {
            const isActive = btn.getAttribute('data-settings-tab') === tabName;
            if (isActive) {
                btn.classList.add('bg-white', 'text-blue-600', 'shadow-sm', 'border-blue-200');
                btn.classList.remove('text-gray-700', 'hover:bg-white', 'hover:border-gray-200', 'border-transparent');
            } else {
                btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm', 'border-blue-200');
                btn.classList.add('text-gray-700', 'hover:bg-white', 'hover:border-gray-200', 'border-transparent');
            }
        });

        // 更新标签内容
        this.elements.tabContents.forEach(content => {
            if (content.id === `settings-${tabName}`) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }

    /**
     * 加载已保存的设置
     */
    async loadSavedSettings() {
        try {
            const config = await this.getStoredConfig();

            // 加载API密钥配置
            if (config.apiKeys) {
                if (config.apiKeys.openai) {
                    this.elements.openaiEndpoint.value = config.apiKeys.openai.endpoint || 'https://api.openai.com/v1';
                    this.elements.openaiModel.value = config.apiKeys.openai.model || 'gpt-4o';
                    this.elements.openaiKey.value = config.apiKeys.openai.key || '';
                }
                if (config.apiKeys.gemini) {
                    this.elements.geminiEndpoint.value = config.apiKeys.gemini.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
                    this.elements.geminiModel.value = config.apiKeys.gemini.model || 'gemini-2.5-pro';
                    this.elements.geminiKey.value = config.apiKeys.gemini.key || '';
                }
                if (config.apiKeys.glm) {
                    this.elements.glmEndpoint.value = config.apiKeys.glm.endpoint || 'https://open.bigmodel.cn/api/paas/v4';
                    this.elements.glmModel.value = config.apiKeys.glm.model || 'glm-4.5-vision';
                    this.elements.glmKey.value = config.apiKeys.glm.key || '';
                }
            }

            // 加载模型参数
            if (config.modelParams) {
                this.loadModelParams(config.modelParams);
            }

            // 加载阅卷策略
            if (config.gradingStrategy) {
                const strategyInput = document.querySelector(`input[value="${config.gradingStrategy}"]`);
                if (strategyInput) {
                    strategyInput.checked = true;
                    this.updateStrategyStyles();
                }
            }

            // 加载高级设置
            if (config.advancedSettings) {
                this.elements.autoSaveToggle.checked = config.advancedSettings.autoSave || true;
                this.elements.debugModeToggle.checked = config.advancedSettings.debugMode || false;
                this.elements.gradingSpeedSelect.value = config.advancedSettings.gradingSpeed || 'normal';
            }

            // 检查API密钥状态
            await this.checkApiKeyStatus();

            console.log('已保存设置加载完成');
        } catch (error) {
            console.error('加载已保存设置失败:', error);
        }
    }

    /**
     * 加载模型参数
     */
    loadModelParams(params) {
        // GPT-4o
        if (params.gpt4o) {
            this.elements.gpt4oTemp.value = params.gpt4o.temperature || 0.7;
            this.elements.gpt4oTempValue.textContent = this.elements.gpt4oTemp.value;
            this.elements.gpt4oMaxTokens.value = params.gpt4o.maxTokens || 2048;
            this.elements.gpt4oMaxTokensValue.textContent = this.elements.gpt4oMaxTokens.value;
            this.elements.gpt4oTopP.value = params.gpt4o.topP || 0.9;
            this.elements.gpt4oTopPValue.textContent = this.elements.gpt4oTopP.value;
        }

        // Gemini
        if (params.gemini) {
            this.elements.geminiTemp.value = params.gemini.temperature || 0.6;
            this.elements.geminiTempValue.textContent = this.elements.geminiTemp.value;
            this.elements.geminiMaxTokens.value = params.gemini.maxTokens || 2048;
            this.elements.geminiMaxTokensValue.textContent = this.elements.geminiMaxTokens.value;
            this.elements.geminiTopK.value = params.gemini.topK || 40;
            this.elements.geminiTopKValue.textContent = this.elements.geminiTopK.value;
        }

        // GLM
        if (params.glm) {
            this.elements.glmTemp.value = params.glm.temperature || 0.65;
            this.elements.glmTempValue.textContent = this.elements.glmTemp.value;
            this.elements.glmMaxTokens.value = params.glm.maxTokens || 2048;
            this.elements.glmMaxTokensValue.textContent = this.elements.glmMaxTokens.value;
            this.elements.glmPenalty.value = params.glm.penalty || 1.1;
            this.elements.glmPenaltyValue.textContent = this.elements.glmPenalty.value;
        }
    }

    /**
     * 保存模型参数
     */
    async saveModelParams() {
        const params = {
            gpt4o: {
                temperature: parseFloat(this.elements.gpt4oTemp.value),
                maxTokens: parseInt(this.elements.gpt4oMaxTokens.value),
                topP: parseFloat(this.elements.gpt4oTopP.value)
            },
            gemini: {
                temperature: parseFloat(this.elements.geminiTemp.value),
                maxTokens: parseInt(this.elements.geminiMaxTokens.value),
                topK: parseInt(this.elements.geminiTopK.value)
            },
            glm: {
                temperature: parseFloat(this.elements.glmTemp.value),
                maxTokens: parseInt(this.elements.glmMaxTokens.value),
                penalty: parseFloat(this.elements.glmPenalty.value)
            }
        };

        const config = await this.getStoredConfig();
        config.modelParams = params;
        await this.saveConfig(config);
    }

    /**
     * 应用预设配置
     */
    async applyPreset(preset) {
        const presets = {
            speed: {
                gpt4o: { temperature: 0.3, maxTokens: 1024, topP: 0.8 },
                gemini: { temperature: 0.2, maxTokens: 1024, topK: 20 },
                glm: { temperature: 0.25, maxTokens: 1024, penalty: 1.05 }
            },
            balance: {
                gpt4o: { temperature: 0.7, maxTokens: 2048, topP: 0.9 },
                gemini: { temperature: 0.6, maxTokens: 2048, topK: 40 },
                glm: { temperature: 0.65, maxTokens: 2048, penalty: 1.1 }
            },
            accuracy: {
                gpt4o: { temperature: 0.2, maxTokens: 4096, topP: 0.95 },
                gemini: { temperature: 0.1, maxTokens: 4096, topK: 60 },
                glm: { temperature: 0.15, maxTokens: 4096, penalty: 1.15 }
            }
        };

        const selectedPreset = presets[preset];
        if (selectedPreset) {
            this.loadModelParams(selectedPreset);
            await this.saveModelParams();

            const presetNames = {
                speed: '速度优先',
                balance: '均衡模式',
                accuracy: '准确优先'
            };

            this.showToast('success', `已应用预设配置：${presetNames[preset]}`);
        }
    }

    /**
     * 更新策略样式
     */
    updateStrategyStyles() {
        this.elements.strategyItems.forEach(item => {
            const radio = item.querySelector('input[type="radio"]');
            if (radio.checked) {
                item.classList.remove('border-gray-200', 'hover:border-blue-300', 'bg-white');
                item.classList.add('border-blue-500', 'bg-blue-50');
            } else {
                item.classList.remove('border-blue-500', 'bg-blue-50');
                item.classList.add('border-gray-200', 'hover:border-blue-300', 'bg-white');
            }
        });
    }

    /**
     * 保存高级设置
     */
    async saveAdvancedSettings() {
        const advancedSettings = {
            autoSave: this.elements.autoSaveToggle.checked,
            debugMode: this.elements.debugModeToggle.checked,
            gradingSpeed: this.elements.gradingSpeedSelect.value
        };

        const config = await this.getStoredConfig();
        config.advancedSettings = advancedSettings;
        await this.saveConfig(config);
    }

    /**
     * 检查API密钥状态
     */
    async checkApiKeyStatus() {
        const providers = ['openai', 'gemini', 'glm'];
        let configuredCount = 0;

        for (const provider of providers) {
            const hasKey = await this.aiService.hasApiKey(provider);
            const statusElement = this.elements[`${provider}Status`];

            if (hasKey) {
                statusElement.textContent = '已配置';
                statusElement.className = 'text-xs text-green-600';
                configuredCount++;
            } else {
                statusElement.textContent = '未配置';
                statusElement.className = 'text-xs text-gray-500';
            }
        }

        // 更新配置状态
        if (configuredCount > 0) {
            this.elements.configStatus.textContent = `已配置 ${configuredCount} 个API密钥`;
            this.elements.configStatus.className = 'text-sm font-medium text-green-600';
        } else {
            this.elements.configStatus.textContent = '请配置至少一个API密钥';
            this.elements.configStatus.className = 'text-sm font-medium text-yellow-600';
        }
    }

    /**
     * 测试API密钥
     */
    async testApiKey(provider) {
        const testBtn = this.elements[`test${provider.charAt(0).toUpperCase() + provider.slice(1)}`];
        const originalHTML = testBtn.innerHTML;
        testBtn.disabled = true;
        testBtn.innerHTML = '<div class="loading-spinner"></div>';
        const statusElement = this.elements[`${provider}Status`];

        try {
            // 收集配置
            const endpoint = this.elements[`${provider}Endpoint`].value;
            const model = this.elements[`${provider}Model`].value;
            const apiKey = this.elements[`${provider}Key`].value.trim();

            if (!apiKey) {
                throw new Error('请输入API Key');
            }

            // 配置临时API密钥
            await this.aiService.configure({
                [`${provider}Key`]: apiKey,
                [`${provider}Endpoint`]: endpoint,
                [`${provider}Model`]: model
            });

            // 执行简单的API调用测试
            let testResult;
            switch (provider) {
                case 'openai':
                    testResult = await this.testOpenAI(apiKey);
                    break;
                case 'gemini':
                    testResult = await this.testGemini(apiKey);
                    break;
                case 'glm':
                    testResult = await this.testGLM(apiKey);
                    break;
                default:
                    throw new Error('未知的提供商');
            }

            if (testResult.success) {
                statusElement.textContent = '测试通过';
                statusElement.className = 'text-xs text-green-600';
                this.showToast('success', `${provider.toUpperCase()} API密钥验证成功`);
            } else {
                throw new Error(testResult.error || '测试失败');
            }
        } catch (error) {
            console.error(`API测试失败 (${provider}):`, error);
            statusElement.textContent = '测试失败';
            statusElement.className = 'text-xs text-red-600';
            this.showToast('error', `${provider.toUpperCase()} API密钥验证失败: ${error.message}`);
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = originalHTML;
        }
    }

    /**
     * 测试OpenAI API
     */
    async testOpenAI(apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 测试Gemini API
     */
    async testGemini(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 测试GLM API
     */
    async testGLM(apiKey) {
        try {
            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'glm-4',
                    messages: [
                        { role: 'user', content: 'Hi' }
                    ],
                    max_tokens: 10
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        const saveBtn = this.elements.saveSettings;
        const originalText = saveBtn.innerHTML;

        // 显示加载状态
        saveBtn.innerHTML = '<div class="loading-spinner"></div>';
        saveBtn.disabled = true;

        try {
            // 收集API密钥配置
            const apiKeys = {
                openai: {
                    endpoint: this.elements.openaiEndpoint.value.trim(),
                    model: this.elements.openaiModel.value,
                    key: this.elements.openaiKey.value.trim()
                },
                gemini: {
                    endpoint: this.elements.geminiEndpoint.value.trim(),
                    model: this.elements.geminiModel.value,
                    key: this.elements.geminiKey.value.trim()
                },
                glm: {
                    endpoint: this.elements.glmEndpoint.value.trim(),
                    model: this.elements.glmModel.value,
                    key: this.elements.glmKey.value.trim()
                }
            };

            // 保存API密钥（只保存非空的）
            for (const [provider, config] of Object.entries(apiKeys)) {
                if (config.key) {
                    await this.aiService.setApiKey(provider, config.key);
                }
            }

            // 保存模型配置
            const config = await this.getStoredConfig();
            config.apiKeys = apiKeys;

            // 保存阅卷策略
            const selectedStrategy = document.querySelector('input[name="grading-strategy"]:checked');
            if (selectedStrategy) {
                config.gradingStrategy = selectedStrategy.value;
            }

            await this.saveConfig(config);

            // 更新状态
            await this.checkApiKeyStatus();

            this.showToast('success', '设置保存成功');
            console.log('设置保存完成', config);
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showToast('error', '保存失败: ' + error.message);
        } finally {
            // 恢复按钮状态
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    /**
     * 更新状态显示
     */
    async updateStatus() {
        await this.checkApiKeyStatus();
    }

    /**
     * 显示Toast消息
     */
    showToast(type, message) {
        const toast = this.elements.toast;
        const icon = this.elements.toastIcon;
        const messageEl = this.elements.toastMessage;

        // 设置图标
        icon.className = `w-5 h-5 ${
            type === 'success' ? 'text-green-500' :
            type === 'error' ? 'text-red-500' :
            'text-blue-500'
        }`;
        icon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info');

        // 设置消息
        messageEl.textContent = message;

        // 显示Toast
        toast.classList.remove('hidden');

        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);

        // 重新初始化Lucide图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * 保存配置到存储
     */
    async saveConfig(config) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise(resolve => {
                chrome.storage.local.set({ ai_config: config }, resolve);
            });
        }
    }

    /**
     * 从存储获取配置
     */
    async getStoredConfig() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise(resolve => {
                chrome.storage.local.get(['ai_config'], (result) => {
                    resolve(result.ai_config || {});
                });
            });
        }
        return {};
    }
}

// 页面加载完成后初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});