/**
 * 智学网AI阅卷助手 - Content Script (简化版)
 * 快速测试版本 - 无模块依赖
 */

// 标记content script已注入
window.zhixueExtensionInjected = true;

/**
 * 添加全局样式
 */
function addGlobalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .zhixue-ai-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .zhixue-ai-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .zhixue-ai-toggle svg {
            width: 20px;
            height: 20px;
        }

        .zhixue-ai-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: white;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
            z-index: 999999;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .zhixue-ai-panel.open {
            transform: translateX(0);
        }

        .zhixue-ai-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .zhixue-ai-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .zhixue-ai-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
        }

        .zhixue-ai-close:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        .zhixue-ai-content {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        }

        .zhixue-ai-status {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .zhixue-ai-status h4 {
            margin: 0 0 10px 0;
            color: #0369a1;
            font-size: 16px;
        }

        .zhixue-ai-status p {
            margin: 0;
            color: #475569;
            font-size: 14px;
            line-height: 1.5;
        }

        .zhixue-ai-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            margin-bottom: 10px;
        }

        .zhixue-ai-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .zhixue-ai-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
    `;
    document.head.appendChild(style);
}

/**
 * 创建主面板
 */
function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'zhixue-ai-panel';
    panel.id = 'zhixue-ai-panel';

    panel.innerHTML = `
        <div class="zhixue-ai-header">
            <h3>AI智能阅卷助手</h3>
            <button class="zhixue-ai-close" onclick="document.getElementById('zhixue-ai-panel').classList.remove('open')">&times;</button>
        </div>
        <div class="zhixue-ai-content">
            <div class="zhixue-ai-status">
                <h4>✅ 扩展已加载</h4>
                <p>智学网AI智能阅卷助手已成功注入到当前页面。</p>
                <p>版本：5.0.0</p>
                <p>当前页面：${window.location.hostname}</p>
            </div>
            <button class="zhixue-ai-button" onclick="alert('AI阅卷功能开发中...')">
                🎯 开始智能阅卷
            </button>
            <button class="zhixue-ai-button" onclick="alert('人工复核功能开发中...')">
                🔍 人工复核
            </button>
            <button class="zhixue-ai-button" onclick="alert('数据分析功能开发中...')">
                📊 数据分析
            </button>
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: #334155;">使用说明</h4>
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                    1. 点击右上角按钮打开面板<br>
                    2. 选择需要的功能模块<br>
                    3. 按照提示进行操作<br>
                    <br>
                    <strong>提示：</strong>完整版功能需要配置API密钥
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    return panel;
}

/**
 * 创建切换按钮
 */
function createToggleButton(panel) {
    const button = document.createElement('button');
    button.className = 'zhixue-ai-toggle';
    button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v10c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V9c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v7c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V7l-8-5z" fill="currentColor"/>
        </svg>
        AI阅卷
    `;

    button.addEventListener('click', () => {
        panel.classList.toggle('open');
    });

    document.body.appendChild(button);
    return button;
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
        console.log('AI扩展已初始化');
        return;
    }

    console.log('🚀 初始化AI智能阅卷助手...');

    // 检查是否是智学网页面
    if (!isZhixuePage()) {
        console.log('非智学网页面，跳过注入');
        return;
    }

    console.log('✅ 智学网页面，开始注入...');

    try {
        // 初始化
        window.zhixueExtensionInitialized = true;

        // 添加样式
        addGlobalStyles();

        // 创建面板和按钮
        const panel = createPanel();
        createToggleButton(panel);

        console.log('✅ AI智能阅卷助手注入成功！');
        console.log('ℹ️ 当前页面：', window.location.hostname);
        console.log('ℹ️ 提示：点击右上角"AI阅卷"按钮打开面板');
    } catch (error) {
        console.error('❌ 扩展初始化失败：', error);
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

console.log('📦 AI智能阅卷助手 Content Script 已加载');
