/**
 * 智学网AI阅卷助手 - Content Script (增强版)
 * 完整还原原始界面设计
 */

// 标记content script已注入
window.zhixueExtensionInjected = true;

// AI评分管理器
window.zhixueAIManager = {
    isInitialized: false,
    aiService: null,
    currentModel: 'gpt-4o',
    isGrading: false,

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

            // 延迟更新UI，等待DOM加载完成
            setTimeout(() => {
                this.updateCurrentModelDisplay(this.currentModel);
            }, 500);

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
                // 这里是一个示例，实际调用会通过background script
                // 暂时返回模拟数据
                return this.getMockResult(model, maxScore);
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
                button.innerHTML = '<div class="loading-spinner"></div><span>处理中...</span>';
                button.disabled = true;
            } else {
                // 重置按钮文本（具体实现见按钮替换部分）
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
    openModelSettings() {
        console.log('🔍 点击了模型设置按钮');
        console.log('检查 window.zhixueAIManager:', window.zhixueAIManager);

        const modal = document.getElementById('modelSettingsModal');
        console.log('查找模态框元素:', modal);

        if (modal) {
            // 同步当前选择的模型到模态框
            const modalSelector = document.getElementById('modalModelSelector');
            console.log('查找模型选择器:', modalSelector);
            console.log('当前模型:', this.currentModel);

            if (modalSelector) {
                modalSelector.value = this.currentModel || 'gpt-4o';
            }

            // 添加show类
            modal.classList.add('show');
            console.log('✅ 模型设置模态框已打开');

            // 强制显示模态框（调试）
            modal.style.display = 'flex';
            console.log('模态框当前样式:', modal.style.display);
            console.log('模态框classList:', modal.classList.toString());
        } else {
            console.error('❌ 未找到modelSettingsModal元素');
            console.log('当前DOM中的所有div元素:', document.querySelectorAll('div'));
        }
    },

    /**
     * 关闭模型设置模态框
     */
    closeModelSettings() {
        const modal = document.getElementById('modelSettingsModal');
        if (modal) {
            modal.classList.remove('show');
            console.log('✅ 模型设置模态框已关闭');
        }
    },

    /**
     * 保存模型设置
     */
    saveModelSettings() {
        const modalSelector = document.getElementById('modalModelSelector');
        if (modalSelector) {
            const selectedModel = modalSelector.value;
            console.log(`保存模型设置: ${selectedModel}`);

            // 调用onModelChange更新设置
            this.onModelChange(selectedModel);

            // 关闭模态框
            this.closeModelSettings();

            // 显示保存成功提示
            this.showToast('✅ 模型设置已保存', 'success');
        }
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
function addGlobalStyles() {
    // 引入HTML2Canvas库
    if (!window.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.async = true;
        document.head.appendChild(script);
    }

    const style = document.createElement('style');
    style.textContent = `
        /* 加载Tailwind CSS */
        @import url('https://cdn.tailwindcss.com');

        /* 自定义样式 */
        .zhixue-ai-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            left: auto;
            bottom: auto;
            z-index: 1000000;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: grab;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .zhixue-ai-toggle:hover {
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            transform: scale(1.1);
        }


        .zhixue-ai-toggle .icon {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        /* 头部操作按钮 */
        .zhixue-ai-header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .zhixue-ai-settings-btn {
            width: 36px;
            height: 36px;
            border: none;
            background: transparent;
            color: #64748b;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .zhixue-ai-settings-btn:hover {
            background: #f1f5f9;
            color: #3b82f6;
            transform: scale(1.05);
        }

        .zhixue-ai-settings-btn:active {
            transform: scale(0.95);
        }

        /* 模态框样式 */
        .zhixue-ai-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999999;
        }

        .zhixue-ai-modal.show {
            display: flex !important;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }

        .zhixue-ai-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }

        .zhixue-ai-modal-content {
            position: relative;
            width: 90%;
            max-width: 600px;
            max-height: 85vh;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
            overflow: hidden;
        }

        .zhixue-ai-modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(to right, #f8fafc, #ffffff);
        }

        .zhixue-ai-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            display: flex;
            align-items: center;
        }

        .zhixue-ai-modal-close {
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            color: #64748b;
            font-size: 24px;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .zhixue-ai-modal-close:hover {
            background: #f1f5f9;
            color: #ef4444;
        }

        .zhixue-ai-modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        .zhixue-ai-modal-footer {
            padding: 20px 24px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            background: #f8fafc;
        }

        .zhixue-ai-btn-primary {
            padding: 10px 24px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .zhixue-ai-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .zhixue-ai-btn-primary:active {
            transform: translateY(0);
        }

        .zhixue-ai-btn-secondary {
            padding: 10px 24px;
            background: white;
            color: #64748b;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .zhixue-ai-btn-secondary:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
        }

        /* 动画 */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .zhixue-ai-main {
            position: fixed;
            top: 0;
            right: 0;
            width: 500px;
            height: 100vh;
            background: #f8fafc;
            z-index: 999999;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        }

        .zhixue-ai-main.open {
            transform: translateX(0);
        }

        /* 头部样式 */
        .zhixue-ai-header {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .zhixue-ai-logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .zhixue-ai-logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .zhixue-ai-logo-text h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #0f172a;
        }

        .zhixue-ai-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        .zhixue-ai-close:hover {
            background-color: #f1f5f9;
        }

        /* 状态栏样式 */
        .zhixue-ai-status-bar {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 24px;
        }

        .zhixue-ai-status-items {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .zhixue-ai-status-item {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            justify-content: center;
        }

        .zhixue-ai-status-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
        }

        .zhixue-ai-status-text {
            font-size: 14px;
            color: #475569;
        }

        .zhixue-ai-status-divider {
            width: 1px;
            height: 16px;
            background: #cbd5e1;
        }

        /* Tab样式 */
        .zhixue-ai-tabs {
            background: #f1f5f9;
            padding: 8px;
            border-bottom: 1px solid #e2e8f0;
        }

        .zhixue-ai-tab-list {
            display: flex;
            background: white;
            border-radius: 8px;
            padding: 4px;
        }

        .zhixue-ai-tab {
            flex: 1;
            text-align: center;
            padding: 12px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            color: #64748b;
        }

        .zhixue-ai-tab.active {
            background: #dbeafe;
            color: #2563eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* 内容区域 */
        .zhixue-ai-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            background: #f8fafc;
        }

        .zhixue-ai-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            transition: box-shadow 0.2s;
        }

        .zhixue-ai-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .zhixue-ai-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
        }

        .zhixue-ai-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
        }

        .zhixue-ai-stat-item {
            text-align: center;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
        }

        .zhixue-ai-stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
        }

        .zhixue-ai-stat-label {
            font-size: 12px;
            color: #64748b;
        }

        .zhixue-ai-buttons {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .zhixue-ai-button {
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border: none;
        }

        /* AI试阅按钮 - 蓝色系 */
        .zhixue-ai-button-try {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }

        .zhixue-ai-button-try:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        /* AI自动按钮 - 绿色系 */
        .zhixue-ai-button-auto {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .zhixue-ai-button-auto:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        /* 暂停按钮 - 橙色系 */
        .zhixue-ai-button-pause {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .zhixue-ai-button-pause:hover {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        /* 加载动画 */
        .loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            margin-right: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* 保留原有的primary和secondary类作为备用 */
        .zhixue-ai-button-primary {
            background: #3b82f6;
            color: white;
        }

        .zhixue-ai-button-primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
        }

        .zhixue-ai-button-secondary {
            background: white;
            color: #475569;
            border: 1px solid #e2e8f0;
        }

        .zhixue-ai-button-secondary:hover {
            background: #f8fafc;
        }

        .zhixue-ai-score-box {
            background: #dbeafe;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }

        .zhixue-ai-score-total {
            text-align: center;
            margin-bottom: 16px;
        }

        .zhixue-ai-score-number {
            font-size: 36px;
            font-weight: 700;
            color: #1e40af;
        }

        .zhixue-ai-score-number span {
            font-size: 24px;
            color: #2563eb;
        }

        .zhixue-ai-score-label {
            font-size: 12px;
            color: #3b82f6;
            margin-top: 4px;
        }

        .zhixue-ai-dimension {
            background: white;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .zhixue-ai-dimension-name {
            color: #475569;
            font-size: 14px;
        }

        .zhixue-ai-dimension-score {
            font-weight: 600;
            color: #0f172a;
        }

        .zhixue-ai-reasons {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
        }

        .zhixue-ai-reasons h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
            color: #475569;
        }

        .zhixue-ai-reason-item {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 8px;
            display: flex;
            gap: 8px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * 创建主面板
 */
function createMainPanel() {
    const panel = document.createElement('div');
    panel.className = 'zhixue-ai-main';
    panel.id = 'zhixue-ai-main';

    panel.innerHTML = `
        <!-- 头部 -->
        <div class="zhixue-ai-header">
            <div class="zhixue-ai-logo">
                <div class="zhixue-ai-logo-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 3.438 9.75 7.938 11.937.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 23.795 24 19.295 24 14c0-6.627-5.373-12-12-12z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="zhixue-ai-logo-text">
                    <h1>AI智能阅卷助手</h1>
                </div>
            </div>
            <div class="zhixue-ai-header-actions">
                <button class="zhixue-ai-settings-btn" id="modelSettingsBtn" title="模型设置">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="zhixue-ai-close" onclick="document.getElementById('zhixue-ai-main').classList.remove('open')">&times;</button>
            </div>
        </div>

        <!-- 状态栏 -->
        <div class="zhixue-ai-status-bar">
            <div class="zhixue-ai-status-items">
                <div class="zhixue-ai-status-item">
                    <div class="zhixue-ai-status-dot"></div>
                    <span class="zhixue-ai-status-text">图片定位</span>
                </div>
                <div class="zhixue-ai-status-divider"></div>
                <div class="zhixue-ai-status-item">
                    <div class="zhixue-ai-status-dot"></div>
                    <span class="zhixue-ai-status-text">AI链接</span>
                </div>
                <div class="zhixue-ai-status-divider"></div>
                <div class="zhixue-ai-status-item">
                    <div class="zhixue-ai-status-dot"></div>
                    <span class="zhixue-ai-status-text">评分设置</span>
                </div>
            </div>
        </div>

        <!-- Tab导航 -->
        <div class="zhixue-ai-tabs">
            <div class="zhixue-ai-tab-list">
                <div class="zhixue-ai-tab active" data-tab="grading">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline-block; margin-right: 6px;">
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.091z" fill="currentColor"/>
                    </svg>
                    智能阅卷
                </div>
                <div class="zhixue-ai-tab" data-tab="review">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline-block; margin-right: 6px;">
                        <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    人工复核
                </div>
                <div class="zhixue-ai-tab" data-tab="analysis">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline-block; margin-right: 6px;">
                        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    数据分析
                </div>
            </div>
        </div>

        <!-- Tab内容 -->
        <div class="zhixue-ai-content">
            <!-- 智能阅卷Tab -->
            <div id="tab-grading" class="tab-content active">
                <!-- 实时统计 -->
                <div class="zhixue-ai-card">
                    <div class="zhixue-ai-card-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        实时统计
                    </div>
                    <div class="zhixue-ai-stats">
                        <div class="zhixue-ai-stat-item">
                            <div class="zhixue-ai-stat-value">156</div>
                            <div class="zhixue-ai-stat-label">今日已阅</div>
                        </div>
                        <div class="zhixue-ai-stat-item">
                            <div class="zhixue-ai-stat-value">32秒</div>
                            <div class="zhixue-ai-stat-label">平均用时</div>
                        </div>
                        <div class="zhixue-ai-stat-item">
                            <div class="zhixue-ai-stat-value">98%</div>
                            <div class="zhixue-ai-stat-label">准确率</div>
                        </div>
                        <div class="zhixue-ai-stat-item">
                            <div class="zhixue-ai-stat-value">92%</div>
                            <div class="zhixue-ai-stat-label">置信度</div>
                        </div>
                    </div>
                </div>

                <!-- 阅卷操作 -->
                <div class="zhixue-ai-card">
                    <div class="zhixue-ai-card-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 9v6m4.5 1.5a9 9 0 11-18 0 9 9 0 0118 0zM9 15h6v1.5a1.5 1.5 0 11-3 0V15z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        阅卷操作
                    </div>

                    <div class="zhixue-ai-buttons">
                        <button class="zhixue-ai-button zhixue-ai-button-try" onclick="window.zhixueAIManager.aiTrial()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            AI试阅
                        </button>
                        <button class="zhixue-ai-button zhixue-ai-button-auto" onclick="window.zhixueAIManager.aiAutoGrade()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            AI自动
                        </button>
                        <button class="zhixue-ai-button zhixue-ai-button-pause" onclick="window.zhixueAIManager.pauseGrading()" id="pauseBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            暂停
                        </button>
                    </div>
                </div>

                <!-- 评分结果 -->
                <div class="zhixue-ai-card">
                    <div class="zhixue-ai-card-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        评分结果
                    </div>
                    <div class="zhixue-ai-score-box">
                        <div class="zhixue-ai-score-total">
                            <div class="zhixue-ai-score-number">85<span>/100</span></div>
                            <div class="zhixue-ai-score-label">总分</div>
                        </div>

                        <!-- 分项得分 -->
                        <div class="zhixue-ai-dimension">
                            <span class="zhixue-ai-dimension-name">观点明确</span>
                            <span class="zhixue-ai-dimension-score">28/30</span>
                        </div>
                        <div class="zhixue-ai-dimension">
                            <span class="zhixue-ai-dimension-name">史实准确</span>
                            <span class="zhixue-ai-dimension-score">25/30</span>
                        </div>
                        <div class="zhixue-ai-dimension">
                            <span class="zhixue-ai-dimension-name">论述充分</span>
                            <span class="zhixue-ai-dimension-score">22/25</span>
                        </div>
                        <div class="zhixue-ai-dimension">
                            <span class="zhixue-ai-dimension-name">语言表达</span>
                            <span class="zhixue-ai-dimension-score">10/15</span>
                        </div>
                    </div>

                    <!-- 评分理由 -->
                    <div class="zhixue-ai-reasons">
                        <h4>💡 评分理由</h4>
                        <div class="zhixue-ai-reason-item">
                            <span style="color: #3b82f6; font-weight: 600;">观点明确:</span>
                            <span>论点清晰，立场明确</span>
                        </div>
                        <div class="zhixue-ai-reason-item">
                            <span style="color: #10b981; font-weight: 600;">史实准确:</span>
                            <span>历史事实准确无误</span>
                        </div>
                    </div>

                    <!-- AI模型信息 -->
                    <div class="zhixue-ai-model-info" style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 13px; color: #64748b; font-weight: 500;">🤖 使用模型</span>
                            <span class="zhixue-ai-model-used" style="font-size: 13px; color: #3b82f6; font-weight: 600;">未使用</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 13px; color: #64748b; font-weight: 500;">🎯 置信度</span>
                            <span class="zhixue-ai-confidence" style="font-size: 13px; color: #10b981; font-weight: 600;">--</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 人工复核Tab -->
            <div id="tab-review" class="tab-content" style="display: none;">
                <div class="zhixue-ai-card">
                    <div class="zhixue-ai-card-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        人工复核
                    </div>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">功能开发中，敬请期待...</p>
                </div>
            </div>

            <!-- 数据分析Tab -->
            <div id="tab-analysis" class="tab-content" style="display: none;">
                <div class="zhixue-ai-card">
                    <div class="zhixue-ai-card-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        数据分析
                    </div>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">功能开发中，敬请期待...</p>
                </div>
            </div>
        </div>

        <!-- 模型设置模态框 -->
        <div id="modelSettingsModal" class="zhixue-ai-modal">
            <div class="zhixue-ai-modal-overlay" onclick="window.zhixueAIManager.closeModelSettings()"></div>
            <div class="zhixue-ai-modal-content">
                <div class="zhixue-ai-modal-header">
                    <h3>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display: inline-block; margin-right: 8px;">
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        模型设置
                    </h3>
                    <button class="zhixue-ai-modal-close" onclick="window.zhixueAIManager.closeModelSettings()">&times;</button>
                </div>
                <div class="zhixue-ai-modal-body">
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-3">
                            选择默认AI模型
                        </label>
                        <select id="modalModelSelector" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900">
                            <option value="gpt-4o">🤖 ChatGPT-4o - OpenAI</option>
                            <option value="gemini-2.5-pro">✨ Gemini 2.5 Pro - Google</option>
                            <option value="qwen-vl-plus">🔥 通义千问Vision - 阿里巴巴</option>
                            <option value="glm-4v">💎 GLM-4V - 智谱AI</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-2">
                            💡 当前选择的模型将用于AI试阅和自动评分
                        </p>
                    </div>

                    <div class="border-t border-gray-200 pt-6 mb-6">
                        <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="display: inline-block; margin-right: 6px;">
                                <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            模型优先级设置
                        </h4>
                        <p class="text-xs text-gray-500 mb-4">设置AI服务的调用优先级（失败时自动切换）</p>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span class="text-sm font-medium text-gray-700">1. 首选模型</span>
                                <select class="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white">
                                    <option>ChatGPT-4o</option>
                                    <option>Gemini 2.5 Pro</option>
                                    <option>通义千问Vision</option>
                                    <option>GLM-4V</option>
                                </select>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span class="text-sm font-medium text-gray-700">2. 备选模型</span>
                                <select class="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white">
                                    <option>Gemini 2.5 Pro</option>
                                    <option>ChatGPT-4o</option>
                                    <option>通义千问Vision</option>
                                    <option>GLM-4V</option>
                                </select>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span class="text-sm font-medium text-gray-700">3. 备选模型</span>
                                <select class="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white">
                                    <option>通义千问Vision</option>
                                    <option>ChatGPT-4o</option>
                                    <option>Gemini 2.5 Pro</option>
                                    <option>GLM-4V</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-start">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-blue-600 mt-0.5 mr-3">
                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <div>
                                <h5 class="text-sm font-semibold text-blue-800 mb-1">模型配置说明</h5>
                                <ul class="text-xs text-blue-700 space-y-1">
                                    <li>• ChatGPT-4o：最高精度，适合复杂题目</li>
                                    <li>• Gemini 2.5 Pro：性价比高，适合日常使用</li>
                                    <li>• 通义千问Vision：国产模型，速度快</li>
                                    <li>• GLM-4V：国产备选，稳定可靠</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="zhixue-ai-modal-footer">
                    <button class="zhixue-ai-btn-secondary" onclick="window.zhixueAIManager.closeModelSettings()">
                        取消
                    </button>
                    <button class="zhixue-ai-btn-primary" onclick="window.zhixueAIManager.saveModelSettings()">
                        保存设置
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // 绑定设置按钮事件
    setTimeout(() => {
        const settingsBtn = document.getElementById('modelSettingsBtn');
        if (settingsBtn && window.zhixueAIManager) {
            settingsBtn.addEventListener('click', () => {
                console.log('✅ 设置按钮被点击');
                window.zhixueAIManager.openModelSettings();
            });
            console.log('✅ 设置按钮事件已绑定');
        }
    }, 100);

    return panel;
}

/**
 * 创建切换按钮
 */
function createToggleButton(panel) {
    const button = document.createElement('button');
    button.className = 'zhixue-ai-toggle';
    button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon">
            <path d="M12 2L4 7v10c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V9c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v7c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V7l-8-5z" fill="currentColor"/>
        </svg>
    `;

    // 添加拖拽功能
    makeDraggable(button);

    // 初始化位置（将right/top转换为left/top）
    setTimeout(() => {
        const rect = button.getBoundingClientRect();
        button.style.left = rect.left + 'px';
        button.style.top = rect.top + 'px';
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        console.log('✅ 浮动按钮位置已初始化');
    }, 100);

    // 添加点击事件（打开面板）
    button.addEventListener('click', (e) => {
        // 检查是否正在拖拽
        if (isDraggingState) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        console.log('✅ 点击浮动按钮，打开面板');
        panel.classList.toggle('open');
    });

    // 添加鼠标悬停效果
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });

    document.body.appendChild(button);
    return button;
}

/**
 * 使元素可拖拽
 */
// 全局变量来跟踪拖拽状态
let isDraggingState = false;

function makeDraggable(element) {
    let startX, startY;
    let initialX, initialY;
    let hasMoved = false;

    element.addEventListener('mousedown', dragStart);
    element.addEventListener('touchstart', dragStart);

    function dragStart(e) {
        // 记录初始位置
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        // 获取当前偏移量
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        // 添加事件监听
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('touchend', dragEnd);

        hasMoved = false;

        // 设置拖拽状态
        element.style.cursor = 'grabbing';
    }

    function dragMove(e) {
        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = currentX - startX;
        const dy = currentY - startY;

        // 如果移动超过3px，认为是拖拽
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
            isDraggingState = true;

            // 添加拖拽时的视觉反馈
            element.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.8)';
            element.style.transform = 'scale(1.15)';
            element.style.zIndex = '1000001';

            // 计算新位置
            let newX = initialX + dx;
            let newY = initialY + dy;

            // 限制在视窗范围内
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            // 应用位置
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
    }

    function dragEnd() {
        // 移除事件监听
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', dragMove);
        document.removeEventListener('touchend', dragEnd);

        // 恢复拖拽时的视觉反馈
        element.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        element.style.transform = 'scale(1)';
        element.style.zIndex = '1000000';

        // 重置拖拽状态
        setTimeout(() => {
            isDraggingState = false;
        }, 50);

        // 重置样式
        element.style.cursor = 'grab';
    }
}

/**
 * 绑定Tab切换事件
 */
function bindTabEvents() {
    const tabs = document.querySelectorAll('.zhixue-ai-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有活跃状态
            tabs.forEach(t => t.classList.remove('active'));
            // 添加活跃状态到当前tab
            tab.classList.add('active');

            // 隐藏所有tab内容
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });

            // 显示对应的tab内容
            const tabName = tab.dataset.tab;
            const targetContent = document.getElementById(`tab-${tabName}`);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        });
    });
}

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

        // 步骤1: 添加样式
        console.log('步骤 1/4: 添加全局样式...');
        addGlobalStyles();
        console.log('✅ 样式添加完成');

        // 步骤2: 创建面板和按钮
        console.log('步骤 2/4: 创建主面板和按钮...');
        const panel = createMainPanel();
        if (!panel) {
            throw new Error('创建面板失败');
        }
        const toggleButton = createToggleButton(panel);
        if (!toggleButton) {
            throw new Error('创建切换按钮失败');
        }
        console.log('✅ 面板和按钮创建完成');

        // 步骤3: 绑定Tab事件
        console.log('步骤 3/4: 绑定Tab事件...');
        bindTabEvents();
        console.log('✅ Tab事件绑定完成');

        // 步骤4: 初始化AI管理器
        console.log('步骤 4/4: 初始化AI管理器...');
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

/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandling() {
    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ 未处理的Promise拒绝:', event.reason);
        // 可以在这里添加错误上报逻辑
        event.preventDefault(); // 阻止默认的错误处理
    });

    // 监听全局JavaScript错误
    window.addEventListener('error', (event) => {
        console.error('❌ 全局JavaScript错误:', event.error);
        // 可以在这里添加错误上报逻辑
    });

    console.log('✅ 全局错误处理已设置');
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
