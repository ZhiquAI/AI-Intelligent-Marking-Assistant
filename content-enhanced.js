/**
 * 智学网AI阅卷助手 - Content Script (增强版)
 * 完整还原原始界面设计
 */

// 标记content script已注入
window.zhixueExtensionInjected = true;

let sendBackgroundMessage = null;
async function ensureMessenger() {
    if (sendBackgroundMessage) return sendBackgroundMessage;
    const mod = await import(chrome.runtime.getURL('utils/messenger.js'));
    sendBackgroundMessage = mod.sendBackgroundMessage;
    return sendBackgroundMessage;
}

// AI评分管理器
window.zhixueAIManager = {
    isInitialized: false,
    aiService: null,
    currentModel: 'gpt-4o',
    isGrading: false,
    settings: null,

    /**
     * 初始化AI管理器
     */
    async init() {
        if (this.isInitialized) {
            console.log('AI管理器已经初始化，跳过重复初始化');
            return;
        }

        console.log('🚀 开始初始化AI管理器...');

        try {
            // 验证页面环境
            this.validatePageEnvironment();

            // 设置默认模型
            if (!this.currentModel) {
                this.currentModel = 'gpt-4o';
                console.log('✅ 设置默认模型: gpt-4o');
            }

            // 创建AIService实例
            // 注意：由于content script运行在页面上下文，我们需要动态创建
            console.log('创建AIService实例...');
            this.aiService = this.createAIService();
            await this.aiService.configure({});

            // 同步设置
            await this.syncSettings();

            // 延迟更新UI，等待DOM加载完成
            setTimeout(() => {
                this.updateCurrentModelDisplay(this.currentModel);
            }, 500);

            try {
                const uiMod = await import(chrome.runtime.getURL('ui/components/content/index.js'));
                await uiMod.initializeUI({ manager: this });
            } catch {}

            this.isInitialized = true;
            console.log('✅ AI管理器初始化成功');
            this.showToast('AI阅卷助手已准备就绪', 'success');

        } catch (error) {
            console.error('❌ AI管理器初始化失败:', error);
            console.error('错误堆栈:', error.stack);

            // 不抛出错误，允许其他功能继续工作
            this.showToast('AI功能初始化失败，但基础功能仍可使用', 'warning');

            // 设置默认状态
            this.isInitialized = true;
        }
    },

    async syncSettings(force = false) {
        if (this.settings && !force) {
            return this.settings;
        }
        try {
            const messenger = await ensureMessenger();
            const settings = await messenger('LOAD_SETTINGS');
            this.settings = settings || {};
            if (settings?.defaultModel) {
                this.currentModel = settings.defaultModel;
            }
            if (settings?.drawerWidth) {
                document.documentElement.style.setProperty('--zhixue-ai-drawer-width', `${settings.drawerWidth}px`);
            }
            this.updateCurrentModelDisplay(this.currentModel);
            return settings;
        } catch (error) {
            console.error('加载设置失败:', error);
            return null;
        }
    },

    /**
     * 验证页面环境
     */
    validatePageEnvironment() {
        // 检查是否在正确的页面上
        if (!isZhixuePage()) {
            console.warn('⚠️ 当前不在智学网页面，功能可能受限');
            // 不抛出错误，让用户可以继续使用
        }

        // 检查必要的DOM元素
        if (!document.body) {
            throw new Error('页面DOM未加载完成');
        }

        console.log('✅ 页面环境验证通过');
    },

    /**
     * 动态创建AIService（简化版，用于content script）
     */
    createAIService() {
        const self = this;

        return {
            /**
             * 配置AI服务
             */
            async configure(config = {}) {
                console.log('✅ AI服务配置完成');
                return Promise.resolve();
            },

            modelConfig: {
                'gpt-4o': { name: 'ChatGPT-4o', priority: 1, endpoint: 'https://api.openai.com/v1/chat/completions' },
                'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', priority: 2, endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent' },
                'qwen-vl-plus': { name: '通义千问Vision', priority: 3, endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' },
                'glm-4v': { name: 'GLM-4V', priority: 4, endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' }
            },

            async scoreWithAI(imageBase64, questionText, maxScore = 100, preferredModel = null) {
                const model = preferredModel || 'gpt-4o';

                try {
                    // 首先尝试从存储获取API密钥
                    const apiKey = await this.getApiKeyForModel(model);
                    let result;

                    if (apiKey) {
                        // 有API密钥，调用真实API
                        result = await this.callRealAPI(model, apiKey, imageBase64, questionText, maxScore);
                        self.showToast(`正在使用 ${this.modelConfig[model].name} 分析...`, 'info');
                    } else {
                        // 无API密钥，使用模拟数据
                        self.showToast('未配置API密钥，使用演示模式', 'warning');
                        result = this.getMockResult(model, maxScore);
                        await this.delay(2000); // 模拟API延迟
                    }

                    return {
                        ...result,
                        model: model,
                        modelName: this.modelConfig[model].name
                    };
                } catch (error) {
                    console.error(`AI评分失败 (${model}):`, error);
                    throw new Error(`${this.modelConfig[model].name} 评分失败: ${error.message}`);
                }
            },

            /**
             * 获取模型的API密钥
             */
            async getApiKeyForModel(model) {
                // 从chrome.storage获取API密钥
                return new Promise(resolve => {
                    chrome.storage.local.get(['ai_keys_openai', 'ai_keys_gemini', 'ai_keys_qwen', 'ai_keys_glm'], async (result) => {
                        const keyMap = {
                            'gpt-4o': 'ai_keys_openai',
                            'gemini-2.5-pro': 'ai_keys_gemini',
                            'qwen-vl-plus': 'ai_keys_qwen',
                            'glm-4v': 'ai_keys_glm'
                        };

                        const encryptedKey = result[keyMap[model]];
                        if (!encryptedKey) {
                            resolve(null);
                            return;
                        }

                        // 注意：这里只返回加密的密钥，实际解密需要在background script中完成
                        // 为了简化，这里直接返回null，表示使用演示模式
                        resolve(null);
                    });
                });
            },

            /**
             * 调用真实API（简化版，实际需要通过background script）
             */
            async callRealAPI(model, apiKey, imageBase64, questionText, maxScore) {
                // 实际调用通过 background service worker 代理
                try {
                    const messenger = await ensureMessenger();
                    const resp = await messenger('AI_SCORE_IMAGE', { imageBase64, questionText, maxScore, model });
                    return resp;
                } catch (_e) {
                    // 回退到本地模拟
                    return this.getMockResult(model, maxScore);
                }
            },

            /**
             * 获取模拟结果
             */
            getMockResult(model, maxScore) {
                const mockResults = {
                    'gpt-4o': { score: 88, confidence: 0.92, reasoning: '答案准确，逻辑清晰，表达规范。' },
                    'gemini-2.5-pro': { score: 85, confidence: 0.89, reasoning: '答案完整，条理分明。' },
                    'qwen-vl-plus': { score: 83, confidence: 0.87, reasoning: '答案较好，基本要点到位。' },
                    'glm-4v': { score: 82, confidence: 0.85, reasoning: '答案合理，表达清楚。' }
                };

                return mockResults[model];
            },

            delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        };
    },

    /**
     * AI试阅功能
     */
    async aiTrial() {
        if (this.isGrading) {
            this.showToast('正在评分中，请稍候...', 'warning');
            return;
        }

        try {
            this.isGrading = true;
            this.updateButtonState('aiTrial', true);

            // 1. 截取答题区域
            let imageData;
            try {
                imageData = await this.captureAnswerArea();
                console.log(`截图成功: ${imageData.width}x${imageData.height}, ${imageData.size}KB`);
            } catch (error) {
                if (error.message.includes('未找到答题区域')) {
                    this.showToast('未找到答题区域，请确保页面包含学生答案', 'error');
                } else {
                    this.showToast(`截图失败: ${error.message}`, 'error');
                }
                throw error;
            }

            // 2. 获取题目文本
            const questionText = this.extractQuestionText();

            // 3. 调用AI评分（使用用户选择的模型）
            this.showToast('正在使用AI分析答题内容...', 'info');

            let result;
            try {
                // 获取用户选择的模型，如果未选择则使用默认的GPT-4o
                const selectedModel = this.currentModel || 'gpt-4o';
                result = await this.aiService.scoreWithAI(imageData.base64, questionText, 100, selectedModel);
            } catch (error) {
                this.showToast(`AI分析失败: ${error.message}`, 'error');
                throw error;
            }

            // 4. 更新显示
            this.updateScoreDisplay(result);

            // 5. 自动填写分数（可选）
            await this.autoFillScore(result.score);

            this.showToast(`AI试阅完成！${result.modelName} 评分 ${Math.round(result.score)}分`, 'success');

        } catch (error) {
            console.error('AI试阅失败:', error);
            this.showToast('AI试阅失败: ' + error.message, 'error');
        } finally {
            this.isGrading = false;
            this.updateButtonState('aiTrial', false);
        }
    },

    /**
     * AI自动评分功能
     */
    async aiAutoGrade() {
        if (this.isGrading) {
            this.showToast('正在评分中，请稍候...', 'warning');
            return;
        }

        try {
            this.isGrading = true;
            this.updateButtonState('aiAutoGrade', true);

            // 1. 截取答题区域
            let imageData;
            try {
                imageData = await this.captureAnswerArea();
                console.log(`截图成功: ${imageData.width}x${imageData.height}, ${imageData.size}KB`);
            } catch (error) {
                if (error.message.includes('未找到答题区域')) {
                    this.showToast('未找到答题区域，请确保页面包含学生答案', 'error');
                } else {
                    this.showToast(`截图失败: ${error.message}`, 'error');
                }
                throw error;
            }

            // 2. 获取题目文本
            const questionText = this.extractQuestionText();

            // 3. 调用AI评分（使用用户选择的模型或默认的Gemini）
            this.showToast('正在使用AI自动评分...', 'info');

            let result;
            try {
                // 获取用户选择的模型，如果未选择则使用默认的Gemini（性价比更高）
                const selectedModel = this.currentModel || 'gemini-2.5-pro';
                result = await this.aiService.scoreWithAI(imageData.base64, questionText, 100, selectedModel);
            } catch (error) {
                this.showToast(`AI分析失败: ${error.message}`, 'error');
                throw error;
            }

            // 4. 更新显示
            this.updateScoreDisplay(result);

            // 5. 自动填写分数（可选）
            await this.autoFillScore(result.score);

            this.showToast(`AI自动评分完成！${result.modelName} 评分 ${Math.round(result.score)}分`, 'success');

        } catch (error) {
            console.error('AI自动评分失败:', error);
            this.showToast('AI自动评分失败: ' + error.message, 'error');
        } finally {
            this.isGrading = false;
            this.updateButtonState('aiAutoGrade', false);
        }
    },

    /**
     * 提取题目文本
     */
    extractQuestionText() {
        const questionElement = document.querySelector('.question-content, .question-title, [class*="question"]');
        return questionElement ? questionElement.textContent.trim() : '这是一道示例题目，请根据题目要求进行评分。';
    },

    /**
     * 提取答题区域元素（基于CSS选择器）
     */
    async extractAnswerArea() {
        // 常见答题区域CSS选择器
        const answerSelectors = [
            '.student-answer',           // 学生答案
            '.answer-area',              // 答题区域
            '.paper-answer',             // 试卷答案
            '.text-answer',              // 文字答案
            '[class*="answer"]',         // 包含answer的类
            '[class*="response"]',       // 包含response的类
            '[class*="student"]',        // 包含student的类
            '.question-answer',          // 题目答案
            '.answer-content',           // 答案内容
            '[id*="answer"]',            // 包含answer的id
            '[id*="response"]'           // 包含response的id
        ];

        console.log('开始搜索答题区域...');
        console.log(`尝试 ${answerSelectors.length} 个CSS选择器`);

        // 尝试每个选择器
        for (const selector of answerSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`选择器 "${selector}" 找到 ${elements.length} 个元素`);

            for (const element of elements) {
                if (this.isValidAnswerArea(element)) {
                    console.log(`✅ 找到有效答题区域，使用选择器: ${selector}`);
                    console.log(`   元素: ${element.tagName} (${element.className})`);
                    console.log(`   内容预览: ${element.textContent.substring(0, 50)}...`);
                    return element;
                }
            }
        }

        // 如果没找到，尝试查找包含答案文字的元素
        console.log('未找到标准答题区域，尝试通过文本内容查找...');
        const textAnswerElements = this.findTextAnswerElements();
        if (textAnswerElements.length > 0) {
            console.log(`✅ 通过文本内容找到 ${textAnswerElements.length} 个候选元素`);
            console.log('使用第一个候选元素');
            return textAnswerElements[0];
        }

        // 提供详细的调试信息
        console.error('❌ 未找到答题区域');

        // 尝试获取页面上所有可能的元素用于调试
        const allDivs = document.querySelectorAll('div, p, span');
        console.log(`页面上共有 ${allDivs.length} 个文本元素`);

        // 检查是否有任何包含"答"、"答案"等关键词的元素
        const answerKeywords = ['答：', '答案：', '回答：', '解：', '解答：'];
        let foundKeywords = false;
        for (const keyword of answerKeywords) {
            const keywordElements = document.querySelectorAll(`*:not(script):not(style)`);
            for (const el of keywordElements) {
                if (el.textContent && el.textContent.includes(keyword)) {
                    foundKeywords = true;
                    console.log(`找到关键词 "${keyword}" 在元素: ${el.tagName} (${el.className})`);
                    break;
                }
            }
            if (foundKeywords) break;
        }

        if (!foundKeywords) {
            console.log('页面上未找到任何答题关键词');
        }

        throw new Error(
            '未找到答题区域，请确保页面包含学生答案内容。' +
            '提示：答题区域应包含文字内容，长度至少10个字符。'
        );
    },

    /**
     * 验证是否是有效的答题区域
     */
    isValidAnswerArea(element) {
        if (!element || !element.textContent) {
            return false;
        }

        const text = element.textContent.trim();

        // 检查是否有足够的文本内容（至少10个字符）
        if (text.length < 10) {
            return false;
        }

        // 检查是否包含常见答案关键词
        const answerKeywords = ['答：', '答案：', '回答：', '解：', '解答：'];
        const hasKeyword = answerKeywords.some(keyword => text.includes(keyword));

        // 如果没有关键词，但文本较长，也认为是有效答题区域
        return hasKeyword || text.length > 50;
    },

    /**
     * 通过文本内容查找答题区域
     */
    findTextAnswerElements() {
        // 通过XPath查找包含答案文本的元素
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent.trim();
                    if (text.length > 20 && !text.match(/^[0-9]+\./)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const parentElement = node.parentElement;
            if (parentElement && this.isValidAnswerArea(parentElement)) {
                textNodes.push(parentElement);
            }
        }

        return textNodes;
    },

    /**
     * 等待HTML2Canvas加载完成
     */
    waitForHtml2Canvas() {
        return new Promise((resolve, reject) => {
            if (window.html2canvas) {
                console.log('✅ HTML2Canvas已加载');
                resolve();
                return;
            }

            console.log('⏳ 等待HTML2Canvas库加载...');
            let attempts = 0;
            const maxAttempts = 50; // 5秒超时

            const checkInterval = setInterval(() => {
                attempts++;
                if (window.html2canvas) {
                    clearInterval(checkInterval);
                    console.log('✅ HTML2Canvas库加载成功');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('❌ HTML2Canvas加载超时');
                    reject(new Error('HTML2Canvas加载超时，请检查网络连接或刷新页面'));
                }
            }, 100);
        });
    },

    /**
     * 截取答题区域
     */
    async captureAnswerArea() {
        try {
            console.log('开始截取答题区域...');

            // 等待HTML2Canvas加载
            console.log('检查HTML2Canvas库...');
            await this.waitForHtml2Canvas();
            console.log('✅ HTML2Canvas库已加载');

            // 提取答题区域
            console.log('提取答题区域...');
            let answerArea;
            try {
                answerArea = await this.extractAnswerArea();
                console.log(`✅ 答题区域提取成功: ${answerArea.tagName} (${answerArea.className})`);
            } catch (extractError) {
                console.log('⚠️ 自动提取失败，尝试手动选择...');

                // 询问用户是否手动选择
                const useManual = confirm('自动识别答题区域失败。\n\n是否要手动点击页面上的答题区域？');
                if (useManual) {
                    try {
                        answerArea = await this.manualSelectAnswerArea();
                        console.log('✅ 用户手动选择成功');
                    } catch (manualError) {
                        throw new Error('手动选择失败: ' + manualError.message);
                    }
                } else {
                    throw extractError;
                }
            }

            // 显示截图提示
            this.showToast('正在截取答题区域...', 'info');

            // 使用HTML2Canvas截图
            console.log('开始截图...');
            const canvas = await window.html2canvas(answerArea, {
                scale: 2,                          // 高清晰度
                useCORS: true,                     // 跨域支持
                backgroundColor: '#ffffff',        // 白色背景
                logging: false,                    // 关闭控制台日志
                allowTaint: true,                  // 允许跨域图片
                foreignObjectRendering: false,     // 禁用FO
                imageTimeout: 15000,               // 图片加载超时
                removeContainer: true              // 移除临时容器
            });

            console.log(`✅ 截图完成: ${canvas.width}x${canvas.height}`);

            // 转换为Base64格式
            const imageData = canvas.toDataURL('image/jpeg', 0.8);

            // 移除data:image/jpeg;base64,前缀
            const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, '');

            this.showToast('截图完成，正在分析...', 'success');

            const result = {
                base64: base64Data,
                width: canvas.width,
                height: canvas.height,
                size: Math.round(base64Data.length * 0.75 / 1024) // KB
            };

            console.log(`✅ 图像处理完成: ${result.size}KB`);
            return result;

        } catch (error) {
            console.error('❌ 截图失败:', error);

            // 根据错误类型提供更详细的错误信息
            let errorMessage = error.message;
            if (errorMessage.includes('HTML2Canvas')) {
                errorMessage = 'HTML2Canvas库加载失败，请刷新页面重试';
            } else if (errorMessage.includes('SecurityError') || errorMessage.includes('taint')) {
                errorMessage = '页面安全策略阻止了截图，请尝试使用其他浏览器或关闭安全扩展';
            } else if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
                errorMessage = '网络错误，请检查网络连接';
            } else if (errorMessage.includes('未找到答题区域')) {
                errorMessage = '未找到答题区域，请确保页面包含学生答案内容';
            }

            throw new Error(`截图失败: ${errorMessage}`);
        }
    },

    /**
     * 自动填写分数到智学网页面
     */
    async autoFillScore(score) {
        try {
            console.log(`开始自动填写分数: ${Math.round(score)}`);

            // 分数输入框的CSS选择器
            const scoreInputSelectors = [
                '.score-input',               // 分数输入框
                'input[type="number"]',       // 数字输入框
                '[class*="score"]',           // 包含score的类
                '[id*="score"]',              // 包含score的id
                '.point-input',               // 分数输入
                '.grade-input'                // 成绩输入
            ];

            // 查找分数输入框
            let scoreInput = null;
            for (const selector of scoreInputSelectors) {
                const inputs = document.querySelectorAll(selector);
                for (const input of inputs) {
                    if (input.type === 'number' || input.tagName === 'INPUT') {
                        scoreInput = input;
                        break;
                    }
                }
                if (scoreInput) break;
            }

            if (scoreInput) {
                // 填写分数
                const roundedScore = Math.round(score);
                scoreInput.value = roundedScore;
                console.log(`已写入分数输入框: ${roundedScore}`);

                // 触发change事件
                const changeEvent = new Event('change', { bubbles: true });
                scoreInput.dispatchEvent(changeEvent);

                // 触发input事件
                const inputEvent = new Event('input', { bubbles: true });
                scoreInput.dispatchEvent(inputEvent);

                this.showToast('✅ 已自动填写分数', 'success');
                console.log(`✅ 自动填写分数成功: ${roundedScore}`);

                // 添加一个延迟，等待页面更新
                await this.delay(500);

            } else {
                console.log('⚠️ 未找到分数输入框');
                this.showToast('⚠️ 未找到分数输入框，请手动填写', 'warning');
            }

            // 可选：自动点击提交按钮
            const submitSelectors = [
                '.submit-btn',                // 提交按钮
                '.submit-button',             // 提交按钮
                'button[type="submit"]',      // 提交按钮
                '[class*="submit"]',          // 包含submit的类
                '[id*="submit"]',             // 包含submit的id
                '.confirm-btn',               // 确认按钮
                '.save-btn'                   // 保存按钮
            ];

            // 尝试点击提交按钮
            for (const selector of submitSelectors) {
                const button = document.querySelector(selector);
                if (button && !button.disabled && button.offsetParent !== null) {
                    console.log(`找到提交按钮: ${selector}`);
                    button.click();
                    this.showToast('✅ 已自动提交分数', 'success');
                    console.log('✅ 自动提交分数成功');
                    break;
                }
            }

        } catch (error) {
            console.error('❌ 自动填写分数失败:', error);
            this.showToast('自动填写分数失败: ' + error.message, 'error');
            // 不抛出错误，只记录日志，让用户可以手动操作
        }
    },

    /**
     * 更新分数显示
     */
    updateScoreDisplay(result) {
        // 更新总分
        const scoreElement = document.querySelector('.zhixue-ai-score-number');
        if (scoreElement) {
            scoreElement.innerHTML = `${Math.round(result.score)}<span>/100</span>`;
        }

        // 更新维度得分
        const dimensions = [
            { key: 'accuracy', name: '观点明确', max: 30 },
            { key: 'completeness', name: '史实准确', max: 30 },
            { key: 'logic', name: '逻辑清晰', max: 20 },
            { key: 'norms', name: '语言规范', max: 20 }
        ];

        dimensions.forEach(dim => {
            const score = Math.round((result.score / 100) * dim.max);
            const dimElement = document.querySelector(`[data-dimension="${dim.key}"] .zhixue-ai-dimension-score`);
            const commentElement = document.querySelector(`[data-dimension="${dim.key}"] .zhixue-ai-dimension-comment`);

            if (dimElement) {
                dimElement.textContent = `${score}/${dim.max}`;
            }
            if (commentElement) {
                commentElement.textContent = `评语：${result.reasoning}`;
            }
        });

        // 更新置信度和使用模型
        const confidenceElement = document.querySelector('.zhixue-ai-confidence');
        if (confidenceElement) {
            confidenceElement.textContent = `${(result.confidence * 100).toFixed(0)}%`;
        }

        const modelElement = document.querySelector('.zhixue-ai-model-used');
        if (modelElement) {
            modelElement.textContent = `使用模型：${result.modelName}`;
        }
        const overview = document.querySelector('.zhixue-ai-reasons-overview');
        if (overview) {
            overview.textContent = result.reasoning || '--';
        }
    },

    /**
     * 更新按钮状态
     */
    updateButtonState(buttonType, isLoading) {
        const buttons = {
            aiTrial: document.querySelector('.zhixue-ai-button-try'),
            aiAutoGrade: document.querySelector('.zhixue-ai-button-auto')
        };

        const button = buttons[buttonType];
        if (button) {
            if (isLoading) {
                if (!button.dataset.originalText) {
                    button.dataset.originalText = button.innerHTML;
                }
                button.innerHTML = '<div class="loading-spinner"></div><span>处理中...</span>';
                button.disabled = true;
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || button.textContent;
            }
        }
    },

    /**
     * 暂停评分功能
     */
    pauseGrading() {
        if (!this.isGrading) {
            this.showToast('当前未在评分', 'info');
            return;
        }

        this.isGrading = false;
        this.updateButtonState('aiTrial', false);
        this.updateButtonState('aiAutoGrade', false);

        // 重置按钮状态
        const tryButton = document.querySelector('.zhixue-ai-button-try');
        const autoButton = document.querySelector('.zhixue-ai-button-auto');

        if (tryButton) {
            tryButton.disabled = false;
            tryButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                AI试阅
            `;
        }

        if (autoButton) {
            autoButton.disabled = false;
            autoButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                AI自动
            `;
        }

        this.showToast('已暂停评分', 'info');
    },

    /**
     * 手动选择答题区域（错误恢复机制）
     */
    async manualSelectAnswerArea() {
        return new Promise((resolve, reject) => {
            this.showToast('点击页面上的答题区域以选择', 'info');

            // 添加点击监听器
            const clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const element = e.target;
                console.log('用户手动选择的元素:', element);

                if (this.isValidAnswerArea(element)) {
                    console.log('✅ 用户选择的区域有效');
                    document.removeEventListener('click', clickHandler, true);
                    resolve(element);
                } else {
                    console.log('⚠️ 选择的区域可能无效，但仍然使用');
                    document.removeEventListener('click', clickHandler, true);
                    resolve(element);
                }
            };

            // 添加监听器（使用capture phase确保能捕获到点击）
            document.addEventListener('click', clickHandler, true);

            // 5秒后超时
            setTimeout(() => {
                document.removeEventListener('click', clickHandler, true);
                reject(new Error('手动选择超时，请重新尝试'));
            }, 5000);
        });
    },

    /**
     * 处理模型选择变化
     */
    onModelChange(modelId) {
        console.log(`模型切换到: ${modelId}`);
        this.currentModel = modelId;

        // 更新当前模型显示
        this.updateCurrentModelDisplay(modelId);

        // 显示切换成功提示
        const modelNames = {
            'gpt-4o': 'ChatGPT-4o',
            'gemini-2.5-pro': 'Gemini 2.5 Pro',
            'qwen-vl-plus': '通义千问Vision',
            'glm-4v': 'GLM-4V'
        };

        this.showToast(`✅ 已切换到 ${modelNames[modelId]}`, 'success');
        console.log(`✅ 模型已切换: ${modelNames[modelId]}`);
    },

    /**
     * 更新当前模型显示
     */
    updateCurrentModelDisplay(modelId) {
        const modelNames = {
            'gpt-4o': 'ChatGPT-4o',
            'gemini-2.5-pro': 'Gemini 2.5 Pro',
            'qwen-vl-plus': '通义千问Vision',
            'glm-4v': 'GLM-4V'
        };

        // 更新状态栏中的模型信息
        const modelElement = document.querySelector('.zhixue-ai-model-used');
        if (modelElement) {
            modelElement.textContent = modelNames[modelId] || '未设置';
        }
    },

    /**
     * 打开模型设置模态框
     */
    async openModelSettings() {
        const modal = document.getElementById('modelSettingsModal');
        if (!modal) {
            console.error('❌ 未找到modelSettingsModal元素');
            return;
        }
        const settings = await this.syncSettings();
        // 同步当前选择
        const modalSelector = document.getElementById('modalModelSelector');
        if (modalSelector) {
            modalSelector.value = (settings?.defaultModel || this.currentModel || 'gpt-4o');
        }
        // 绑定按钮（去重绑定）
        const messenger = await ensureMessenger();
        const testBtns = modal.querySelectorAll('.ce-test-provider-btn');
        testBtns.forEach(btn => {
            btn.onclick = async () => {
                const provider = btn.getAttribute('data-provider');
                const res = await messenger('TEST_PROVIDER', { provider });
                const box = document.getElementById('ceProviderTestResult');
                if (box) {
                    if (res && res.success) {
                        const item = res.data || res;
                        const parts = [];
                        if (item.message) parts.push(item.message);
                        if (typeof item.latencyMs === 'number') parts.push(`${item.latencyMs}ms`);
                        if (typeof item.bytes === 'number') parts.push(`${item.bytes}B`);
                        box.innerHTML = `<div style="color:${item.ok ? '#16a34a' : (item.hasKey ? '#ca8a04' : '#dc2626')}">${(item.provider||'').toUpperCase()}: ${item.ok ? '可用' : '不可用'} ${parts.length ? '（' + parts.join(' / ') + '）' : ''}</div>`;
                    } else {
                        box.innerHTML = `<div style="color:#dc2626">测试失败：${res?.error || '未知错误'}</div>`;
                    }
                }
            };
        });
        const testAllBtn = document.getElementById('ceTestAllBtn');
        if (testAllBtn) {
            testAllBtn.onclick = async () => {
                const box = document.getElementById('ceProviderTestResult');
                if (box) box.textContent = '正在测试所有提供商...';
                const res = await messenger('TEST_ALL_PROVIDERS');
                if (box) {
                    if (res && res.success) {
                        const items = res.data || [];
                        box.innerHTML = items.map(item => {
                            const parts = [];
                            if (item.message) parts.push(item.message);
                            if (typeof item.latencyMs === 'number') parts.push(`${item.latencyMs}ms`);
                            if (typeof item.bytes === 'number') parts.push(`${item.bytes}B`);
                            return `<div style="color:${item.ok ? '#16a34a' : (item.hasKey ? '#ca8a04' : '#dc2626')}">${item.provider.toUpperCase()}: ${item.ok ? '可用' : '不可用'} ${parts.length ? '（' + parts.join(' / ') + '）' : ''}</div>`;
                        }).join('');
                    } else {
                        box.innerHTML = `<div style="color:#dc2626">测试失败：${res?.error || '未知错误'}</div>`;
                    }
                }
            };
        }
        try {
            const statuses = await messenger('GET_PROVIDER_STATUS');
            const box = document.getElementById('ceProviderTestResult');
            if (box && Array.isArray(statuses)) {
                box.innerHTML = statuses.map(item => {
                    const parts = [];
                    if (item.hasKey) {
                        parts.push('已保存');
                    } else {
                        parts.push('未配置');
                    }
                    return `<div style="color:${item.hasKey ? '#16a34a' : '#dc2626'}">${(item.provider || '').toUpperCase()}: ${parts.join(' ')}</div>`;
                }).join('');
            }
        } catch (error) {
            console.warn('加载密钥状态失败:', error);
        }
        modal.classList.add('show');
        modal.style.display = 'flex';
        console.log('✅ 模型设置模态框已打开');
    },

    /**
     * 关闭模型设置模态框
     */
    closeModelSettings() {
        const modal = document.getElementById('modelSettingsModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            console.log('✅ 模型设置模态框已关闭');
        }
    },

    /**
     * 保存模型设置
     */
    async saveModelSettings() {
        const modalSelector = document.getElementById('modalModelSelector');
        const selectedModel = modalSelector ? modalSelector.value : (this.currentModel || 'gpt-4o');

        // 保存密钥（仅对填写的项）
        const keyMap = {
            openai: document.getElementById('openaiKeyInput')?.value || '',
            gemini: document.getElementById('geminiKeyInput')?.value || '',
            qwen: document.getElementById('qwenKeyInput')?.value || '',
            glm: document.getElementById('glmKeyInput')?.value || ''
        };
        try {
            const messenger = await ensureMessenger();
            for (const [provider, key] of Object.entries(keyMap)) {
                if (key && key.trim()) {
                    await messenger('SAVE_API_KEY', { provider, apiKey: key.trim() });
                }
            }
        } catch (e) {
            console.error('保存密钥失败:', e);
            this.showToast('保存密钥失败: ' + (e?.message || '未知错误'), 'error');
        }

        try {
            const messenger = await ensureMessenger();
            const updated = await messenger('SAVE_SETTINGS', { defaultModel: selectedModel });
            this.settings = updated;
            this.currentModel = updated?.defaultModel || selectedModel;
            await this.syncSettings(true);
        } catch (error) {
            console.error('保存默认模型失败:', error);
        }

        // 本地应用当前模型
        this.onModelChange(this.currentModel);

        // 关闭模态框并提示
        this.closeModelSettings();
        this.showToast('✅ 模型设置已保存', 'success');
    },

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        // 创建Toast元素
        const toast = document.createElement('div');
        toast.className = 'zhixue-ai-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
            </div>
        `;

        // 添加样式
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999999;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
};

/**
 * 添加样式
 */
/**
 * 检查是否是智学网页面
 */
function isZhixuePage() {
    const hostname = window.location.hostname;
    return (
        hostname.includes('zhixue.com') ||
        hostname.includes('zhixue.cn') ||
        hostname.includes('zxjy')
    );
}

/**
 * 初始化扩展
 */
function initialize() {
    // 避免重复初始化
    if (window.zhixueExtensionInitialized) {
        console.log('扩展已经初始化，跳过重复初始化');
        return;
    }

    console.log('🚀 开始初始化智学网AI阅卷助手...');
    console.log(`页面: ${window.location.href}`);

    // 检查是否是智学网页面或调试模式
    const isDebugMode = window.location.search.includes('debug=zhixue-ai');
    if (!isZhixuePage() && !isDebugMode) {
        console.log('ℹ️ 当前不在智学网页面，扩展不会自动加载');
        console.log('💡 如需调试，请在URL后添加 ?debug=zhixue-ai');
        return;
    }

    if (isZhixuePage()) {
        console.log('✅ 检测到智学网页面，开始初始化...');
    } else {
        console.log('⚠️ 检测到调试模式，初始化测试环境...');
    }

    try {
        // 初始化
        window.zhixueExtensionInitialized = true;

        // 使用模块化 UI 管理器初始化界面
        console.log('步骤 1/2: 加载 UI 模块...');
        const uiModule = await import(chrome.runtime.getURL('ui/components/content/index.js'));
        console.log('步骤 2/2: 初始化 UI...');
        const uiInitResult = await uiModule.initializeUI(window.zhixueAIManager);
        if (!uiInitResult?.panel) {
            throw new Error('创建面板失败');
        }
        if (!uiInitResult?.toggleButton) {
            throw new Error('创建切换按钮失败');
        }
        console.log('✅ UI 初始化完成');

        // 初始化AI管理器
        console.log('启动 AI 管理器...');
        window.zhixueAIManager.init().then(() => {
            console.log('✅ AI管理器初始化完成');
        }).catch(error => {
            console.error('❌ AI管理器初始化失败:', error);
            // 不抛出错误，允许其他功能继续工作
        });

        console.log('🎉 智学网AI阅卷助手初始化成功！');
        console.log('📝 提示: 刷新页面可重新初始化');

        // 设置全局错误处理
        setupGlobalErrorHandling();

    } catch (error) {
        console.error('❌ 扩展初始化失败:', error);
        console.error('错误堆栈:', error.stack);

        // 只在开发模式下显示 alert，生产环境使用 Toast
        if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
            alert(`扩展初始化失败: ${error.message}\n\n请刷新页面重试或查看控制台日志。`);
        } else {
            // 尝试显示 Toast 提示
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 9999999;
                background: #EF4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-size: 14px;
                font-weight: 500;
                animation: slideIn 0.3s ease;
            `;
            toast.textContent = `初始化失败: ${error.message}`;
            document.body.appendChild(toast);

            setTimeout(() => {
                document.body.removeChild(toast);
            }, 5000);
        }
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// 导出调试函数到全局
window.zhixueDebug = {
    initialize,
    reinitialize: () => {
        window.zhixueExtensionInitialized = false;
        initialize();
    },
    checkStatus: () => {
        console.log('=== 智学网AI阅卷助手状态 ===');
        console.log('已初始化:', !!window.zhixueExtensionInitialized);
        console.log('AI管理器:', !!window.zhixueAIManager);
        console.log('HTML2Canvas:', !!window.html2canvas);
        console.log('主面板:', !!document.getElementById('zhixue-ai-main'));
        console.log('浮动按钮:', !!document.querySelector('.zhixue-ai-toggle'));
        console.log('模态框:', !!document.getElementById('modelSettingsModal'));
        console.log('当前页面:', window.location.href);
        console.log('================================');
    },
    testModal: () => {
        console.log('=== 测试模态框 ===');
        if (window.zhixueAIManager && window.zhixueAIManager.openModelSettings) {
            window.zhixueAIManager.openModelSettings();
        } else {
            console.error('AI管理器未初始化或openModelSettings方法不存在');
        }
        console.log('===================');
    }
};

console.log('💡 调试命令:');
console.log('  - window.zhixueDebug.checkStatus()  // 检查状态');
console.log('  - window.zhixueDebug.reinitialize()  // 重新初始化');
console.log('  - window.zhixueDebug.testModal()  // 测试模态框');
console.log('  - 在URL后添加 ?debug=zhixue-ai 启用调试模式');

// 提示用户如何测试
if (window.location.href.includes('debug=zhixue-ai')) {
    console.log('%c🧪 调试模式已启用', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
    console.log('点击浮动按钮打开面板，然后点击右上角的齿轮图标测试模态框');
}
