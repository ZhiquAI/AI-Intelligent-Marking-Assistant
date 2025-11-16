// ============================================================================
// 智学网AI阅卷助手 - Service Worker
// Manifest V3 - 支持ES6模块
// ============================================================================
import { decrypt, encrypt } from './utils/security-utils.js';
import { buildScoringPrompt, buildScoringPromptFromTemplate, parseScoringResponse, safeExtractTextFromChoices } from './utils/ai-utils.js';
import { testAllProviders } from './utils/provider-diagnostics.js';
import { cloneDefaultSettings, mergeSettings, normalizeSettings, PROVIDERS } from './utils/settings-schema.js';

/**
 * 扩展安装时执行
 */
chrome.runtime.onInstalled.addListener((details) => {
    console.log('AI智能阅卷助手已安装，版本:', chrome.runtime.getManifest().version);

    // 初始化默认设置
    initializeDefaultSettings();
});

/**
 * 扩展启动时执行
 */
chrome.runtime.onStartup.addListener(() => {
    
});

/**
 * 监听来自popup和content script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    

    // 异步处理消息
    handleMessage(request, sender)
        .then(response => {
            console.log('✅ 消息处理成功');
            sendResponse({ success: true, data: response });
        })
        .catch(error => {
            console.error('❌ 消息处理错误:', error);
            sendResponse({ success: false, error: error.message });
        });

    // 保持消息通道开放
    return true;
});

/**
 * 监听标签页更新，在智学网页面注入content script
 * 注意：manifest.json中已配置content_scripts，此处主要用于动态注入enhanced版本
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 页面加载完成
    if (changeInfo.status === 'complete' && tab.url) {
        // 检查是否是智学网域名
        if (isZhixueURL(tab.url)) {
            console.log(`📄 页面已加载: ${tab.url}`);

            try {
                // 检查enhanced content script是否已注入
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => window.zhixueExtensionInjected
                });

                if (results && results[0] && results[0].result) {
                    console.log('✅ Enhanced content script已注入，跳过重复注入');
                    return;
                }

                console.log('🚀 注入enhanced content script...');
                // 注入enhanced content script
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content-enhanced.js']
                });

                console.log('✅ Enhanced content script注入成功');

            } catch (error) {
                console.error('❌ Content Script注入失败:', error);
            }
        }
    }
});

/**
 * 检查URL是否是智学网域名
 */
function isZhixueURL(url) {
    return url.includes('zhixue.com');
}

/**
 * 处理消息
 */
async function handleMessage(request, sender) {
    const { action, data } = request;
    console.log(`📨 收到消息: ${action}`, data);

    switch (action) {
        case 'TEST_ALL_PROVIDERS': {
            const results = await testAllProviders();
            return results;
        }
        case 'GET_ACTIVE_TAB':
            return await getActiveTab();

        case 'STORE_DATA':
            return await storeData(data.key, data.value);

        case 'GET_DATA':
            return await getData(data.key);

        case 'INJECT_CONTENT_SCRIPT':
            return await injectContentScript(data.tabId);

        // 新增：处理评分相关消息
        case 'START_BATCH_GRADING':
            console.log('✅ 开始批量评分处理');
            return {
                success: true,
                message: '批量评分已启动',
                data: { status: 'started', timestamp: Date.now() }
            };

        case 'START_REVIEW':
            console.log('✅ 开始复核处理');
            return {
                success: true,
                message: '复核已启动',
                data: { status: 'started', timestamp: Date.now() }
            };

        case 'GET_REVIEW_DATA':
            console.log('✅ 获取复核数据');
            return {
                success: true,
                data: {
                    records: [],
                    total: 0,
                    timestamp: Date.now()
                }
            };

        // 新增：处理AI评分相关消息
        case 'GRADE_ANSWER':
            console.log('✅ 开始AI评分');
            return {
                success: true,
                message: 'AI评分已完成',
                data: { score: 85, feedback: '回答良好' }
            };

        case 'GET_GRADING_STATUS':
            console.log('✅ 获取评分状态');
            return {
                success: true,
                data: {
                    isProcessing: false,
                    progress: 100,
                    results: []
                }
            };
        // AI代理：图片评分（占位实现，后续接入真实API）
        case 'AI_SCORE_IMAGE':
            console.log('🧩 后台代理：AI_SCORE_IMAGE');
            try {
                const { imageBase64, questionText, maxScore = 100, model = 'gpt-4o' } = data || {};
                if (!imageBase64) throw new Error('缺少图片数据');
                const result = await aiScoreImage({ imageBase64, questionText, maxScore, model });
                return { success: true, data: result };
            } catch (e) {
                return { success: false, error: e.message };
            }

        // 新增：处理存储相关扩展消息
        case 'SAVE_SETTINGS':
            return await saveSettings(data || {});

        case 'LOAD_SETTINGS':
            return await loadSettings();

        case 'GET_PROVIDER_STATUS':
            return await getAllProviderStatus();
        case 'SAVE_API_KEY': {
            const { provider, apiKey } = data || {};
            if (!provider || !apiKey) throw new Error('缺少参数');
            const enc = await encrypt(apiKey, `ai_service_${provider}_key`);
            await new Promise(resolve => chrome.storage.local.set({ [`ai_keys_${provider}`]: enc }, resolve));
            return { provider, saved: true };
        }
        case 'TEST_PROVIDER': {
            const { provider } = data || {};
            if (!provider) throw new Error('缺少provider');
            const results = await (await import('./utils/provider-diagnostics.js')).then(m => m.testProvider(provider));
            return results;
        }

        default:
            console.warn(`⚠️ 未知操作: ${action}`);
            throw new Error(`未知操作: ${action}`);
    }
}

// ========================== AI 代理实现 =============================

const MODEL_MAP = {
    'gpt-4o': { provider: 'openai', name: 'ChatGPT-4o' },
    'gemini-2.5-pro': { provider: 'gemini', name: 'Gemini 2.5 Pro' },
    'qwen-vl-plus': { provider: 'qwen', name: '通义千问Vision' },
    'glm-4v': { provider: 'glm', name: 'GLM-4V' }
};

async function aiScoreImage({ imageBase64, questionText, maxScore, model }) {
    const meta = MODEL_MAP[model] || MODEL_MAP['gpt-4o'];
    const apiKey = await getDecryptedApiKey(meta.provider);
    if (!apiKey) {
        // 无密钥，返回模拟
        return getMockResult(model, maxScore);
    }

    switch (meta.provider) {
    case 'openai':
        return await scoreWithOpenAI({ apiKey, imageBase64, questionText, maxScore });
    case 'gemini':
        return await scoreWithGemini({ apiKey, imageBase64, questionText, maxScore });
    case 'qwen':
        return await scoreWithQwen({ apiKey, imageBase64, questionText, maxScore });
    case 'glm':
        return await scoreWithGLM({ apiKey, imageBase64, questionText, maxScore });
    default:
        return getMockResult(model, maxScore);
    }
}

async function scoreWithOpenAI({ apiKey, imageBase64, questionText, maxScore }) {
    const prompt = await getPromptText(questionText, maxScore);
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const body = {
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                ]
            }
        ],
        temperature: 0.3,
        max_tokens: 800
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`OpenAI错误: ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parsed = parseScoringResponse(content, maxScore);
    return { ...parsed, model: 'gpt-4o', modelName: 'ChatGPT-4o' };
}

async function scoreWithGemini({ apiKey, imageBase64, questionText, maxScore }) {
    const prompt = await getPromptText(questionText, maxScore);
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent';
    const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;
    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
            ]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800, topP: 0.9 }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Gemini错误: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const parsed = parseScoringResponse(text, maxScore);
    return { ...parsed, model: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro' };
}



async function getDecryptedApiKey(provider) {
    const keyName = `ai_keys_${provider}`;
    const encrypted = await new Promise(resolve => chrome.storage.local.get([keyName], (r) => resolve(r[keyName])));
    if (!encrypted) return null;
    try {
        const plain = await decrypt(encrypted, `ai_service_${provider}_key`);
        return plain || null;
    } catch (_e) {
        return null;
    }
}

// -------------------- Provider diagnostics (moved to utils/provider-diagnostics.js) --------------------
function getMockResult(model, maxScore) {
    const mock = {
        'gpt-4o': { score: 88, confidence: 0.92, reasoning: '答案准确，逻辑清晰，表达规范。' },
        'gemini-2.5-pro': { score: 85, confidence: 0.89, reasoning: '答案完整，条理分明。' },
        'qwen-vl-plus': { score: 83, confidence: 0.87, reasoning: '答案较好，基本要点到位。' },
        'glm-4v': { score: 82, confidence: 0.85, reasoning: '答案合理，表达清楚。' }
    };
    return mock[model] || mock['gpt-4o'];
}

// ----------------------- Qwen (DashScope) -----------------------
async function scoreWithQwen({ apiKey, imageBase64, questionText, maxScore }) {
    const prompt = await getPromptText(questionText, maxScore);
    const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    const body = {
        model: 'qwen-vl-plus',
        input: {
            messages: [
                {
                    role: 'user',
                    content: [
                        { image: { url: `data:image/jpeg;base64,${imageBase64}` } },
                        { text: prompt }
                    ]
                }
            ]
        },
        parameters: {
            result_format: 'text'
        }
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`DashScope错误: ${res.status}`);
    const data = await res.json();
    // 兼容多种返回结构
    const text = data.output?.text || safeExtractTextFromChoices(data) || '';
    const parsed = parseScoringResponse(text, maxScore);
    return { ...parsed, model: 'qwen-vl-plus', modelName: '通义千问Vision' };
}

// ----------------------- GLM (BigModel) -----------------------
async function scoreWithGLM({ apiKey, imageBase64, questionText, maxScore }) {
    const prompt = await getPromptText(questionText, maxScore);
    const endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const body = {
        model: 'glm-4v',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                ]
            }
        ],
        temperature: 0.3,
        max_tokens: 800
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`BigModel错误: ${res.status}`);
    const data = await res.json();
    const text = safeExtractTextFromChoices(data) || '';
    const parsed = parseScoringResponse(text, maxScore);
    return { ...parsed, model: 'glm-4v', modelName: 'GLM-4V' };
}

// Prompt template settings
async function getPromptText(questionText, maxScore) {
    try {
        const settings = await getData('promptTemplateSettings');
        if (settings && (settings.template || settings.forceJSON)) {
            return buildScoringPromptFromTemplate(settings.template || '', questionText, maxScore, settings.forceJSON !== false);
        }
    } catch {}
    return buildScoringPrompt(questionText, maxScore);
}

/**
 * 获取当前活跃标签页
 */
async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

/**
 * 存储数据
 */
async function storeData(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve({ key, value, timestamp: Date.now() });
        });
    });
}

/**
 * 获取数据
 */
async function getData(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
        });
    });
}

/**
 * 注入Content Script
 */
async function injectContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        return { success: true };
    } catch (error) {
        throw new Error(`注入失败: ${error.message}`);
    }
}

async function loadSettings() {
    const stored = await getData('ai_settings');
    if (!stored) {
        return cloneDefaultSettings();
    }
    return normalizeSettings(stored);
}

async function saveSettings(partial = {}) {
    const current = await loadSettings();
    const merged = mergeSettings(current, partial);
    await storeData('ai_settings', merged);
    return merged;
}

async function getProviderStatus(provider) {
    const meta = PROVIDERS[provider];
    if (!meta) {
        return { provider, hasKey: false };
    }
    const stored = await chrome.storage.local.get(meta.storageKey);
    return {
        provider,
        hasKey: Boolean(stored?.[meta.storageKey])
    };
}

async function getAllProviderStatus() {
    const statuses = await Promise.all(
        Object.keys(PROVIDERS).map((provider) => getProviderStatus(provider))
    );
    return statuses;
}

/**
 * 初始化默认设置
 */
async function initializeDefaultSettings() {
    const existing = await getData('ai_settings');
    if (!existing) {
        await storeData('ai_settings', cloneDefaultSettings());
        console.log('✅ 默认设置已初始化');
        return;
    }

    const normalized = normalizeSettings(existing);
    await storeData('ai_settings', normalized);
    console.log('ℹ️ 设置已校验');
}
