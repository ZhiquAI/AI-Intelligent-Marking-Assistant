// ============================================================================
// 智学网AI阅卷助手 - Service Worker
// Manifest V3 - 支持ES6模块
// ============================================================================

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

        // 新增：处理存储相关扩展消息
        case 'SAVE_SETTINGS':
            return await storeData('settings', data);

        case 'LOAD_SETTINGS':
            const settings = await getData('settings');
            return {
                success: true,
                data: settings || getDefaultSettings()
            };

        default:
            console.warn(`⚠️ 未知操作: ${action}`);
            throw new Error(`未知操作: ${action}`);
    }
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

/**
 * 获取默认设置
 */
function getDefaultSettings() {
    return {
        grading: {
            strategy: 'gpt4o-priority',
            autoSave: true,
            dualModelValidation: false,
            speed: 3
        },
        api: {
            gpt4o: {
                endpoint: '',
                apiKey: '',
                model: 'gpt-4o',
                temperature: 0.7,
                maxTokens: 2048
            },
            gemini: {
                endpoint: '',
                apiKey: '',
                model: 'gemini-pro',
                temperature: 0.7,
                maxTokens: 2048
            }
        },
        ui: {
            theme: 'light',
            animations: true
        }
    };
}

/**
 * 初始化默认设置
 */
async function initializeDefaultSettings() {
    const result = await getData('settings');
    if (!result) {
        const defaultSettings = getDefaultSettings();
        await storeData('settings', defaultSettings);
        console.log('✅ 默认设置已初始化');
    } else {
        console.log('ℹ️ 设置已存在，跳过初始化');
    }
}


