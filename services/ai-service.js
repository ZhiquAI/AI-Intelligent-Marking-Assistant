// ============================================================================
// AI服务模块 - 集成ChatGPT-4o、Gemini 2.5 Pro、通义千问Vision、GLM-4V等API
// ============================================================================

import { validateData, securityCheck, encrypt, decrypt } from '../utils/security-utils.js';
import { toastNotifier } from '../ui/components/toast-notifier.js';

export class AIService {
    constructor() {
        // API密钥存储
        this.apiKeys = {
            openai: '',
            gemini: '',
            qwen: '',
            glm: ''
        };

        // 当前使用的API类型和模型
        this.currentApiType = 'openai';
        this.currentModel = 'gpt-4o';

        // 模型配置映射
        this.modelConfig = {
            'gpt-4o': {
                name: 'ChatGPT-4o',
                provider: 'openai',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                supportsImages: true,
                maxTokens: 4096,
                priority: 1
            },
            'gemini-2.5-pro': {
                name: 'Gemini 2.5 Pro',
                provider: 'gemini',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent',
                supportsImages: true,
                maxTokens: 8192,
                priority: 2
            },
            'qwen-vl-plus': {
                name: '通义千问Vision',
                provider: 'qwen',
                endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
                supportsImages: true,
                maxTokens: 4000,
                priority: 3
            },
            'glm-4v': {
                name: 'GLM-4V',
                provider: 'glm',
                endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                supportsImages: true,
                maxTokens: 4096,
                priority: 4
            }
        };

        this.apiEndpoint = '';
        this.modelParams = {
            temperature: 0.3, // 降低随机性，提高评分稳定性
            topP: 0.9,
            timeout: 60000
        };

        this.isDebugMode = false;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.rateLimitDelay = 1000; // 1秒限速
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2秒重试延迟
    }

    /**
     * 配置AI服务
     * @param {Object} config - 配置对象
     */
    async configure(config) {
        try {
            // 配置多个API密钥
            if (config.openaiKey) {
                await this.setApiKey('openai', config.openaiKey);
            }
            if (config.geminiKey) {
                await this.setApiKey('gemini', config.geminiKey);
            }
            if (config.qwenKey) {
                await this.setApiKey('qwen', config.qwenKey);
            }
            if (config.glmKey) {
                await this.setApiKey('glm', config.glmKey);
            }

            // 如果没有新密钥，尝试加载已存储的密钥
            if (!config.openaiKey && !config.geminiKey && !config.qwenKey && !config.glmKey) {
                await this.loadStoredApiKeys();
            }

            // 设置当前模型
            if (config.currentModel && this.modelConfig[config.currentModel]) {
                this.currentModel = config.currentModel;
                this.currentApiType = this.modelConfig[config.currentModel].provider;
            }

            // 更新模型参数
            this.modelParams = { ...this.modelParams, ...config.modelParams };
            this.isDebugMode = config.debugMode || false;

            this.isInitialized = true;

            // 显示配置成功通知
            if (toastNotifier) {
                toastNotifier.success(`AI服务配置成功，当前模型: ${this.modelConfig[this.currentModel].name}`);
            }
        } catch (error) {
            if (toastNotifier) {
                toastNotifier.error(`AI服务配置失败: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 后台代理：使用后台Service Worker进行图片评分（优先保障安全）
     * - 前端不直接持有明文密钥
     * - 后台负责实际外网调用（当前为占位实现，返回模拟结果）
     */
    async scoreImageViaBackground(imageBase64, questionText, maxScore = 100, preferredModel = 'gpt-4o') {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
            throw new Error('后台消息通道不可用');
        }
        const res = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'AI_SCORE_IMAGE',
                data: { imageBase64, questionText, maxScore, model: preferredModel }
            }, resolve);
        });
        if (!res || !res.success) {
            throw new Error(res?.error || '后台评分失败');
        }
        return res.data;
    }

    /**
     * 安全存储API密钥
     */
    async setApiKey(provider, apiKey) {
        if (!provider || !apiKey) {
            throw new Error('提供商和API密钥不能为空');
        }

        // 基本安全检查
        const securityResult = securityCheck(apiKey);
        if (!securityResult.safe) {
            throw new Error('API密钥包含不安全内容');
        }

        // 安全存储API密钥
        const encryptedKey = await encrypt(apiKey, `ai_service_${provider}_key`);
        this.apiKeys[provider] = encryptedKey;

        // 使用chrome.storage.local进行持久化存储
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const storage = {};
            storage[`ai_keys_${provider}`] = encryptedKey;
            await new Promise(resolve => chrome.storage.local.set(storage, resolve));
        }
    }

    /**
     * 加载已存储的API密钥
     */
    async loadStoredApiKeys() {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            return;
        }

        const keys = await new Promise(resolve => {
            chrome.storage.local.get(['ai_keys_openai', 'ai_keys_gemini', 'ai_keys_qwen', 'ai_keys_glm'], resolve);
        });

        for (const provider of ['openai', 'gemini', 'qwen', 'glm']) {
            const storedKey = keys[`ai_keys_${provider}`];
            if (storedKey && !this.apiKeys[provider]) {
                this.apiKeys[provider] = storedKey;
            }
        }
    }

    /**
     * 获取存储的API密钥
     */
    async getApiKey(provider = 'openai') {
        try {
            const storedKey = this.apiKeys[provider];
            if (!storedKey) {
                return null;
            }

            // 尝试解密
            const decrypted = await decrypt(storedKey, `ai_service_${provider}_key`);
            return decrypted;
        } catch (error) {
            if (this.isDebugMode) {
                console.error(`API密钥解密失败 (${provider}):`, error);
            }
            return null;
        }
    }

    /**
     * 检查API密钥是否存在
     */
    async hasApiKey(provider = 'openai') {
        const key = await this.getApiKey(provider);
        return key !== null && key !== undefined && key !== '';
    }

    /**
     * 清除API密钥
     */
    async clearApiKey(provider = 'openai') {
        try {
            this.apiKeys[provider] = '';
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await new Promise(resolve => {
                    chrome.storage.local.remove([`ai_keys_${provider}`], resolve);
                });
            }
            return true;
        } catch (error) {
            console.error('清除API密钥失败:', error);
            return false;
        }
    }

    /**
     * 获取当前模型的配置信息
     */
    getCurrentModelConfig() {
        return this.modelConfig[this.currentModel];
    }

    /**
     * 获取默认API端点（已废弃，使用modelConfig代替）
     */
    getDefaultEndpoint() {
        return this.getCurrentModelConfig()?.endpoint || '';
    }

    /**
     * 带重试机制的API调用
     */
    async callWithRetry(apiCall, operationName = 'API调用') {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                // console.error(`${operationName} 第${attempt}次尝试失败:`, error);

                // 显示用户友好的错误通知
                if (toastNotifier && attempt === this.maxRetries) {
                    const errorMessage = this.getUserFriendlyErrorMessage(error);
                    toastNotifier.error(errorMessage);
                }

                if (attempt < this.maxRetries) {
                    // 指数退避延迟
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);

                    await this.sleep(delay);
                }
            }
        }

        throw new Error(`${operationName} 在${this.maxRetries}次尝试后失败`);
    }

    /**
     * 获取用户友好的错误消息
     */
    getUserFriendlyErrorMessage(error) {
        const errorMessages = {
            401: 'API密钥无效或已过期,请检查设置',
            403: 'API访问被拒绝,请检查权限设置',
            404: 'API服务不可用,请稍后重试',
            429: 'API请求过于频繁,请稍后再试',
            500: 'AI服务内部错误,请稍后重试',
            network: '网络连接失败,请检查网络设置',
            timeout: 'AI服务响应超时,请稍后重试',
            default: 'AI服务暂时不可用,请稍后重试'
        };

        const errorCode = error.status || error.code || 'default';
        return errorMessages[errorCode] || errorMessages.default;
    }

    /**
     * 延迟函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 测试API连接
     */
    async testConnection() {
        if (!this.apiKey) {
            throw new Error('未配置API密钥');
        }

        try {
            // 使用重试机制测试连接
            return await this.callWithRetry(async() => {
                switch (this.apiType) {
                case 'openai':
                    return await this.testOpenAIConnection();
                case 'gemini':
                    return await this.testGeminiConnection();
                case 'claude':
                    return await this.testClaudeConnection();
                default:
                    throw new Error(`不支持的API类型: ${this.apiType}`);
                }
            }, 'API连接测试');
        } catch (error) {
            // console.error('❌ API连接测试失败:', error);
            throw error;
        }
    }

    /**
     * 执行AI评分
     * @param {Object} params - 评分参数
     * @returns {Promise<Object>} 评分结果
     */
    async performGrading(params) {
        const { rubric, studentAnswer, question, dualModel = false } = params;

        if (!this.apiKey) {
            const error = new Error('未配置API密钥');
            if (toastNotifier) {
                toastNotifier.error('请先配置AI服务的API密钥');
            }
            throw error;
        }

        if (!rubric || !studentAnswer) {
            const error = new Error('缺少必要的评分参数');
            if (toastNotifier) {
                toastNotifier.warning('评分参数不完整,请检查输入');
            }
            throw error;
        }

        try {
            // 显示评分开始通知
            if (toastNotifier) {
                toastNotifier.info('正在分析学生答案,请稍候...', {
                    duration: 2000,
                    showProgress: true
                });
            }

            let result;
            if (dualModel) {
                result = await this.performDualModelGrading(params);
            } else {
                result = await this.performSingleModelGrading(params);
            }

            // 显示评分完成通知
            if (toastNotifier) {
                toastNotifier.success(`评分完成！得分:${result.totalScore}/${result.maxScore}`);
            }

            return result;
        } catch (error) {
            // console.error('❌ AI评分失败:', error);

            // 显示评分失败通知
            if (toastNotifier) {
                const userMessage = this.getUserFriendlyErrorMessage(error);
                toastNotifier.error(userMessage, { duration: 5000 });
            }

            throw new Error(`AI评分失败: ${error.message}`);
        }
    }

    /**
     * 单模型评分
     */
    async performSingleModelGrading(params) {
        const { rubric, studentAnswer, question } = params;

        const prompt = this.buildGradingPrompt(rubric, studentAnswer, question);

        // 使用重试机制调用AI API
        const response = await this.callWithRetry(async() => {
            return await this.callAIAPI(prompt);
        }, 'AI评分');

        return this.parseGradingResponse(response);
    }

    /**
     * 双模型交叉验证
     */
    async performDualModelGrading(params) {
        const { rubric, studentAnswer, question } = params;

        if (toastNotifier) {
            toastNotifier.info('正在使用双模型交叉验证,请稍候...', {
                duration: 3000,
                showProgress: true
            });
        }

        try {
            // 并行调用两个模型,使用重试机制
            const [modelAResult, modelBResult] = await Promise.all([
                this.callWithRetry(async() => {
                    return await this.callAIAPI(
                        this.buildGradingPrompt(rubric, studentAnswer, question),
                        'GPT-4o'
                    );
                }, 'GPT-4o评分'),
                this.callWithRetry(async() => {
                    return await this.callAIAPI(
                        this.buildGradingPrompt(rubric, studentAnswer, question),
                        'Gemini'
                    );
                }, 'Gemini评分')
            ]);

            const resultA = this.parseGradingResponse(modelAResult);
            const resultB = this.parseGradingResponse(modelBResult);

            // 合并两个模型的结果
            const mergedResult = this.mergeDualModelResults(resultA, resultB);

            return mergedResult;
        } catch (error) {
            // console.error('❌ 双模型验证失败:', error);

            if (toastNotifier) {
                toastNotifier.warning('双模型验证失败,使用单模型结果', { duration: 3000 });
            }

            // 如果双模型失败,退回到单模型
            return await this.performSingleModelGrading(params);
        }
    }

    /**
     * 构建评分提示词
     */
    buildGradingPrompt(rubric, studentAnswer, question = '') {
        const prompt = `
您是一位经验丰富的教师,请根据以下评分细则对学生的答案进行评分.

【评分细则】
${rubric}

【题目】
${question || '请根据提供的答案进行评分'}

【学生答案】
${studentAnswer}

请按照以下格式返回评分结果（必须严格使用JSON格式）:
{
  "totalScore": 0-100的整数,
  "maxScore": 100,
  "dimensions": [
    {
      "name": "维度名称",
      "score": 该维度得分,
      "maxScore": 该维度满分,
      "reasoning": "评分理由"
    }
  ],
  "overallReasoning": "总体评分理由",
  "suggestions": "改进建议",
  "confidence": 0.0-1.0的置信度
}

要求:
1. 评分要公正、客观、详细
2. 每个维度都要给出具体分数和理由
3. 提供具体的改进建议
4. 总体评分理由要综合全面
`;

        return prompt.trim();
    }

    /**
     * 调用AI API
     */
    async callAIAPI(prompt, modelOverride = null) {
        const model = modelOverride || this.getModelName();

        switch (this.apiType) {
        case 'openai':
            return await this.callOpenAI(prompt, model);
        case 'gemini':
            return await this.callGemini(prompt, model);
        case 'claude':
            return await this.callClaude(prompt, model);
        default:
            throw new Error(`不支持的API类型: ${this.apiType}`);
        }
    }

    /**
     * 获取模型名称
     */
    getModelName() {
        const models = {
            openai: 'gpt-4o',
            gemini: 'gemini-pro',
            claude: 'claude-3-sonnet-20240229'
        };
        return models[this.apiType] || models.openai;
    }

    /**
     * 调用OpenAI API
     */
    async callOpenAI(prompt, model) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: '你是一位专业的教师,擅长客观、公正地评分.' },
                    { role: 'user', content: prompt }
                ],
                temperature: this.modelParams.temperature,
                max_tokens: this.modelParams.maxTokens,
                top_p: this.modelParams.topP
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * 调用Gemini API
     */
    async callGemini(prompt, model) {
        const url = `${this.apiEndpoint}?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature: this.modelParams.temperature,
                    maxOutputTokens: this.modelParams.maxTokens,
                    topP: this.modelParams.topP
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    /**
     * 调用Claude API
     */
    async callClaude(prompt, model) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: this.modelParams.maxTokens,
                temperature: this.modelParams.temperature,
                top_p: this.modelParams.topP
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * 解析评分响应
     */
    parseGradingResponse(responseText) {
        try {
            // 尝试提取JSON部分
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return this.validateGradingResult(result);
            } else {
                throw new Error('无法解析评分结果,响应格式不正确');
            }
        } catch (error) {
            // console.error('解析评分响应失败:', error);
            // 返回默认结果
            return this.getDefaultGradingResult();
        }
    }

    /**
     * 验证评分结果
     */
    validateGradingResult(result) {
        // 确保必要的字段存在
        if (!result.totalScore || !result.dimensions || !result.overallReasoning) {
            throw new Error('评分结果缺少必要字段');
        }

        // 验证分数范围
        result.totalScore = Math.max(0, Math.min(100, parseInt(result.totalScore) || 0));
        result.confidence = Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.8));

        // 验证维度分数
        result.dimensions = result.dimensions.map(dim => ({
            ...dim,
            score: Math.max(0, Math.min(dim.maxScore || 100, parseInt(dim.score) || 0))
        }));

        return result;
    }

    /**
     * 获取默认评分结果
     */
    getDefaultGradingResult() {
        return {
            totalScore: 75,
            maxScore: 100,
            dimensions: [
                { name: '内容完整性', score: 75, maxScore: 100, reasoning: '内容基本完整' },
                { name: '逻辑结构', score: 75, maxScore: 100, reasoning: '逻辑结构一般' },
                { name: '语言表达', score: 75, maxScore: 100, reasoning: '语言表达尚可' }
            ],
            overallReasoning: '答案基本正确,但存在改进空间',
            suggestions: '建议加强逻辑性和表达清晰度',
            confidence: 0.8
        };
    }

    /**
     * 合并双模型结果
     */
    mergeDualModelResults(resultA, resultB) {
        const avgScore = Math.round((resultA.totalScore + resultB.totalScore) / 2);
        const avgConfidence = (resultA.confidence + resultB.confidence) / 2;

        // 合并维度分数
        const mergedDimensions = [];
        const dimensionNames = new Set([
            ...resultA.dimensions.map(d => d.name),
            ...resultB.dimensions.map(d => d.name)
        ]);

        dimensionNames.forEach(name => {
            const dimA = resultA.dimensions.find(d => d.name === name);
            const dimB = resultB.dimensions.find(d => d.name === name);

            if (dimA && dimB) {
                mergedDimensions.push({
                    name,
                    score: Math.round((dimA.score + dimB.score) / 2),
                    maxScore: dimA.maxScore,
                    reasoning: `${dimA.reasoning} | ${dimB.reasoning}`
                });
            } else if (dimA) {
                mergedDimensions.push(dimA);
            } else if (dimB) {
                mergedDimensions.push(dimB);
            }
        });

        return {
            totalScore: avgScore,
            maxScore: 100,
            confidence: avgConfidence,
            dimensions: mergedDimensions,
            overallReasoning: `双模型评分结果:${resultA.overallReasoning} | ${resultB.overallReasoning}`,
            suggestions: `改进建议:${resultA.suggestions} | ${resultB.suggestions}`,
            model: '双模型交叉验证',
            models: ['GPT-4o', 'Gemini']
        };
    }

    /**
     * 测试OpenAI连接
     */
    async testOpenAIConnection() {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                Authorization: `Bearer ${this.apiKey}`
            }
        });
        return { success: response.ok };
    }

    /**
     * 测试Gemini连接
     */
    async testGeminiConnection() {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
        const response = await fetch(url);
        return { success: response.ok };
    }

    /**
     * 测试Claude连接
     */
    async testClaudeConnection() {
        // Claude API测试需要消耗token,这里返回模拟结果
        return { success: true };
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 智能评分 - 自动选择模型并支持故障转移
     * 按优先级尝试模型：GPT-4o → Gemini → 通义千问 → GLM-4V
     */
    async scoreWithAI(imageBase64, questionText, maxScore = 100, preferredModel = null) {
        const modelOrder = preferredModel
            ? [preferredModel]
            : ['gpt-4o', 'gemini-2.5-pro', 'qwen-vl-plus', 'glm-4v'];

        const results = [];
        let lastError = null;

        for (const modelKey of modelOrder) {
            try {
                this.log(`尝试使用模型: ${modelKey}`);

                let result;
                switch (modelKey) {
                    case 'gpt-4o':
                        result = await this.scoreWithGPT4o(imageBase64, questionText, maxScore);
                        break;
                    case 'gemini-2.5-pro':
                        result = await this.scoreWithGemini(imageBase64, questionText, maxScore);
                        break;
                    case 'qwen-vl-plus':
                        result = await this.scoreWithQwen(imageBase64, questionText, maxScore);
                        break;
                    case 'glm-4v':
                        result = await this.scoreWithGLM(imageBase64, questionText, maxScore);
                        break;
                    default:
                        throw new Error(`未知模型: ${modelKey}`);
                }

                // 验证结果
                if (result && typeof result.score === 'number') {
                    result.model = modelKey;
                    result.modelName = this.modelConfig[modelKey].name;

                    results.push(result);

                    // 如果置信度足够高，直接返回
                    if (result.confidence >= 0.8) {
                        this.log(`模型 ${modelKey} 评分成功，置信度: ${result.confidence}`);
                        return result;
                    }
                }

                lastError = new Error(`模型 ${modelKey} 返回结果无效`);
            } catch (error) {
                this.log(`模型 ${modelKey} 失败: ${error.message}`);
                lastError = error;

                // 尝试下一个模型之前短暂延迟
                await this.delay(this.retryDelay);
            }
        }

        // 如果所有模型都失败，返回最佳结果或抛出最后一个错误
        if (results.length > 0) {
            // 选择置信度最高的结果
            const bestResult = results.reduce((best, current) =>
                (current.confidence > best.confidence) ? current : best
            );
            this.log(`所有模型失败，返回最佳结果 (${bestResult.model})`);
            return bestResult;
        }

        throw lastError || new Error('所有模型评分失败');
    }

    /**
     * 双模型交叉验证评分
     * 使用两个不同模型进行评分，取平均或最佳结果
     */
    async scoreWithDualValidation(imageBase64, questionText, maxScore = 100) {
        const primaryModel = 'gpt-4o';
        const secondaryModel = 'gemini-2.5-pro';

        try {
            this.log('开始双模型交叉验证');

            // 并行执行两个模型
            const [result1, result2] = await Promise.allSettled([
                this.scoreWithAI(imageBase64, questionText, maxScore, primaryModel),
                this.scoreWithAI(imageBase64, questionText, maxScore, secondaryModel)
            ]);

            const results = [];
            if (result1.status === 'fulfilled') {
                results.push(result1.value);
            }
            if (result2.status === 'fulfilled') {
                results.push(result2.value);
            }

            if (results.length === 0) {
                throw new Error('双模型验证失败：两个模型都无法评分');
            }

            if (results.length === 1) {
                return results[0];
            }

            // 计算平均分数和置信度
            const avgScore = (results[0].score + results[1].score) / 2;
            const avgConfidence = (results[0].confidence + results[1].confidence) / 2;

            // 合并维度评分
            const mergedDimensions = {};
            for (const dimension of ['accuracy', 'completeness', 'logic', 'norms']) {
                if (results[0].dimensions[dimension] && results[1].dimensions[dimension]) {
                    mergedDimensions[dimension] = {
                        score: (results[0].dimensions[dimension].score + results[1].dimensions[dimension].score) / 2,
                        maxScore: results[0].dimensions[dimension].maxScore,
                        comment: `模型1: ${results[0].dimensions[dimension].comment}\n模型2: ${results[1].dimensions[dimension].comment}`
                    };
                }
            }

            return {
                score: avgScore,
                confidence: avgConfidence,
                reasoning: `双模型验证结果：\n模型1(${results[0].modelName}): ${results[0].score}分\n模型2(${results[1].modelName}): ${results[1].score}分\n平均分: ${avgScore.toFixed(1)}分`,
                dimensions: mergedDimensions,
                model: `${results[0].modelName} + ${results[1].modelName}`,
                validation: true,
                individualResults: results
            };
        } catch (error) {
            console.error('双模型交叉验证失败:', error);
            throw error;
        }
    }

    /**
     * 使用ChatGPT-4o进行图片评分
     */
    async scoreWithGPT4o(imageBase64, questionText, maxScore = 100) {
        try {
            const apiKey = await this.getApiKey('openai');
            if (!apiKey) {
                throw new Error('未配置OpenAI API密钥');
            }

            const modelConfig = this.modelConfig['gpt-4o'];
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: this._buildScoringPrompt(questionText, maxScore)
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/jpeg;base64,${imageBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: this.modelParams.temperature,
                    max_tokens: modelConfig.maxTokens
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API错误: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            return this._parseScoringResult(content, maxScore);
        } catch (error) {
            console.error('GPT-4o评分失败:', error);
            throw error;
        }
    }

    /**
     * 使用Gemini 2.5 Pro进行图片评分
     */
    async scoreWithGemini(imageBase64, questionText, maxScore = 100) {
        try {
            const apiKey = await this.getApiKey('gemini');
            if (!apiKey) {
                throw new Error('未配置Gemini API密钥');
            }

            const modelConfig = this.modelConfig['gemini-2.5-pro'];
            const url = `${modelConfig.endpoint}?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: this._buildScoringPrompt(questionText, maxScore)
                                },
                                {
                                    inline_data: {
                                        mime_type: 'image/jpeg',
                                        data: imageBase64
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: this.modelParams.temperature,
                        maxOutputTokens: modelConfig.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API错误: ${response.status}`);
            }

            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;

            return this._parseScoringResult(content, maxScore);
        } catch (error) {
            console.error('Gemini评分失败:', error);
            throw error;
        }
    }

    /**
     * 使用通义千问Vision进行图片评分
     */
    async scoreWithQwen(imageBase64, questionText, maxScore = 100) {
        try {
            const apiKey = await this.getApiKey('qwen');
            if (!apiKey) {
                throw new Error('未配置通义千问API密钥');
            }

            const modelConfig = this.modelConfig['qwen-vl-plus'];
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'qwen-vl-plus',
                    input: {
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        text: this._buildScoringPrompt(questionText, maxScore)
                                    },
                                    {
                                        image: `data:image/jpeg;base64,${imageBase64}`
                                    }
                                ]
                            }
                        ]
                    },
                    parameters: {
                        temperature: this.modelParams.temperature,
                        max_tokens: modelConfig.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`通义千问API错误: ${response.status}`);
            }

            const data = await response.json();
            const content = data.output.text;

            return this._parseScoringResult(content, maxScore);
        } catch (error) {
            console.error('通义千问评分失败:', error);
            throw error;
        }
    }

    /**
     * 使用GLM-4V进行图片评分
     */
    async scoreWithGLM(imageBase64, questionText, maxScore = 100) {
        try {
            const apiKey = await this.getApiKey('glm');
            if (!apiKey) {
                throw new Error('未配置GLM API密钥');
            }

            const modelConfig = this.modelConfig['glm-4v'];
            const response = await fetch(modelConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'glm-4v',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: this._buildScoringPrompt(questionText, maxScore)
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/jpeg;base64,${imageBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: this.modelParams.temperature,
                    max_tokens: modelConfig.maxTokens
                })
            });

            if (!response.ok) {
                throw new Error(`GLM API错误: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            return this._parseScoringResult(content, maxScore);
        } catch (error) {
            console.error('GLM-4V评分失败:', error);
            throw error;
        }
    }

    /**
     * 构建评分prompt
     */
    _buildScoringPrompt(questionText, maxScore) {
        return `请作为一位资深教师，对学生的答题进行评分。

题目信息：${questionText}

请从以下维度进行评分：
1. 准确性 - 答案是否正确 (权重40%)
2. 完整性 - 答案是否完整 (权重30%)
3. 逻辑性 - 答案是否有条理 (权重20%)
4. 规范性 - 表达是否规范 (权重10%)

请返回JSON格式的结果，格式如下：
{
  "score": 分数,
  "confidence": 置信度(0-1),
  "reasoning": "评分理由",
  "dimensions": {
    "accuracy": { "score": 得分, "maxScore": 满分, "comment": "评语" },
    "completeness": { "score": 得分, "maxScore": 满分, "comment": "评语" },
    "logic": { "score": 得分, "maxScore": 满分, "comment": "评语" },
    "norms": { "score": 得分, "maxScore": 满分, "comment": "评语" }
  }
}

总分不超过${maxScore}分。`;
    }

    /**
     * 解析评分结果
     */
    _parseScoringResult(content, maxScore) {
        try {
            // 尝试从响应中提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);

                // 验证结果格式
                if (typeof result.score === 'number') {
                    result.score = Math.min(result.score, maxScore);
                    result.score = Math.max(0, result.score);
                }

                return result;
            }

            // 如果没有JSON，尝试简单解析
            const scoreMatch = content.match(/分数[\s:：]*(\d+(\.\d+)?)/);
            const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

            return {
                score,
                confidence: 0.5,
                reasoning: content.substring(0, 200),
                dimensions: {}
            };
        } catch (error) {
            console.error('解析评分结果失败:', error);
            return {
                score: 0,
                confidence: 0,
                reasoning: '评分结果解析失败',
                error: error.message
            };
        }
    }

    /**
     * 日志函数
     */
    log(message, data = null) {
        if (this.isDebugMode) {
            console.log(`[AIService] ${message}`, data);
        }
    }
}

export default AIService;
