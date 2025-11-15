/**
 * 设置页面脚本
 * 处理API密钥配置、模型选择和验证
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

            // API密钥输入框
            openaiKey: document.getElementById('openaiKey'),
            geminiKey: document.getElementById('geminiKey'),
            qwenKey: document.getElementById('qwenKey'),
            glmKey: document.getElementById('glmKey'),

            // 测试按钮
            testOpenAI: document.getElementById('testOpenAI'),
            testGemini: document.getElementById('testGemini'),
            testQwen: document.getElementById('testQwen'),
            testGLM: document.getElementById('testGLM'),

            // 状态显示
            openaiStatus: document.getElementById('openaiStatus'),
            geminiStatus: document.getElementById('geminiStatus'),
            qwenStatus: document.getElementById('qwenStatus'),
            glmStatus: document.getElementById('glmStatus'),

            // 保存按钮
            saveSettings: document.getElementById('saveSettings'),

            // 模型配置
            defaultModel: document.getElementById('defaultModel'),
            autoGradingModel: document.getElementById('autoGradingModel'),
            enableDualValidation: document.getElementById('enableDualValidation'),

            // 状态信息
            currentModel: document.getElementById('currentModel'),
            configStatus: document.getElementById('configStatus'),

            // 消息提示
            toast: document.getElementById('toast'),
            toastIcon: document.getElementById('toastIcon'),
            toastMessage: document.getElementById('toastMessage')
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
     * 加载已保存的设置
     */
    async loadSavedSettings() {
        try {
            // 加载模型配置
            const config = await this.getStoredConfig();

            if (config.defaultModel) {
                this.elements.defaultModel.value = config.defaultModel;
            }
            if (config.autoGradingModel) {
                this.elements.autoGradingModel.value = config.autoGradingModel;
            }
            if (config.enableDualValidation !== undefined) {
                this.elements.enableDualValidation.checked = config.enableDualValidation;
            }

            // 检查API密钥状态
            await this.checkApiKeyStatus();

            console.log('已保存设置加载完成');
        } catch (error) {
            console.error('加载已保存设置失败:', error);
        }
    }

    /**
     * 检查API密钥状态
     */
    async checkApiKeyStatus() {
        const providers = ['openai', 'gemini', 'qwen', 'glm'];
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
     * 绑定事件监听器
     */
    bindEvents() {
        // 关闭按钮
        this.elements.closeBtn.addEventListener('click', () => {
            window.close();
        });

        // 保存按钮
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });

        // 测试按钮
        this.elements.testOpenAI.addEventListener('click', () => {
            this.testApiKey('openai', this.elements.openaiKey.value);
        });
        this.elements.testGemini.addEventListener('click', () => {
            this.testApiKey('gemini', this.elements.geminiKey.value);
        });
        this.elements.testQwen.addEventListener('click', () => {
            this.testApiKey('qwen', this.elements.qwenKey.value);
        });
        this.elements.testGLM.addEventListener('click', () => {
            this.testApiKey('glm', this.elements.glmKey.value);
        });

        // 模型配置变化
        this.elements.defaultModel.addEventListener('change', () => {
            this.updateCurrentModel();
        });
        this.elements.autoGradingModel.addEventListener('change', () => {
            this.updateCurrentModel();
        });

        // 输入框回车事件
        const inputs = [
            this.elements.openaiKey,
            this.elements.geminiKey,
            this.elements.qwenKey,
            this.elements.glmKey
        ];
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const provider = input.id.replace('Key', '');
                    this.testApiKey(provider, input.value);
                }
            });
        });
    }

    /**
     * 测试API密钥
     */
    async testApiKey(provider, apiKey) {
        const testBtn = this.elements[`test${provider.charAt(0).toUpperCase() + provider.slice(1)}`];
        const btnText = testBtn.querySelector('.test-btn-text');
        const spinner = testBtn.querySelector('.loading-spinner');
        const statusElement = this.elements[`${provider}Status`];

        // 显示加载状态
        btnText.textContent = '测试中...';
        spinner.classList.remove('hidden');
        testBtn.disabled = true;

        try {
            // 配置临时API密钥
            await this.aiService.configure({ [`${provider}Key`]: apiKey });

            // 执行简单的API调用测试
            let testResult;
            switch (provider) {
                case 'openai':
                    testResult = await this.testOpenAI(apiKey);
                    break;
                case 'gemini':
                    testResult = await this.testGemini(apiKey);
                    break;
                case 'qwen':
                    testResult = await this.testQwen(apiKey);
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
            // 恢复按钮状态
            btnText.textContent = '测试';
            spinner.classList.add('hidden');
            testBtn.disabled = false;
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
     * 测试通义千问API
     */
    async testQwen(apiKey) {
        try {
            const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'qwen-turbo',
                    input: {
                        messages: [
                            { role: 'user', content: 'Hello' }
                        ]
                    },
                    parameters: {
                        max_tokens: 10
                    }
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
            // 收集API密钥
            const keys = {
                openaiKey: this.elements.openaiKey.value.trim(),
                geminiKey: this.elements.geminiKey.value.trim(),
                qwenKey: this.elements.qwenKey.value.trim(),
                glmKey: this.elements.glmKey.value.trim()
            };

            // 保存API密钥（只保存非空的）
            for (const [provider, key] of Object.entries(keys)) {
                if (key) {
                    await this.aiService.setApiKey(provider.replace('Key', ''), key);
                }
            }

            // 保存模型配置
            const config = {
                defaultModel: this.elements.defaultModel.value,
                autoGradingModel: this.elements.autoGradingModel.value,
                enableDualValidation: this.elements.enableDualValidation.checked
            };

            await this.saveConfig(config);

            // 更新状态
            await this.checkApiKeyStatus();
            this.updateCurrentModel();

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
     * 更新当前模型显示
     */
    updateCurrentModel() {
        const defaultModel = this.elements.defaultModel.value;
        const modelNames = {
            'gpt-4o': 'ChatGPT-4o',
            'gemini-2.5-pro': 'Gemini 2.5 Pro',
            'qwen-vl-plus': '通义千问Vision',
            'glm-4v': 'GLM-4V'
        };

        this.elements.currentModel.textContent = modelNames[defaultModel] || '未设置';
    }

    /**
     * 更新状态显示
     */
    async updateStatus() {
        this.updateCurrentModel();
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
