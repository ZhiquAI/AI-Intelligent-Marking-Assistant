/**
 * HTML模板加载器 - 增强版
 * 提供异步加载HTML模板的功能，支持缓存和错误处理
 */

class TemplateLoader {
    constructor() {
        this.cache = new Map();
        this.basePath = 'ui/templates/';
    }

    /**
     * 异步加载HTML模板
     * @param {string} templateName - 模板文件名（不含.html扩展名）
     * @returns {Promise<string>} - 模板HTML字符串
     */
    async load(templateName) {
        // 检查缓存
        if (this.cache.has(templateName)) {
            return this.cache.get(templateName);
        }

        try {
            // 构建完整的模板路径
            const templatePath = `${this.basePath}${templateName}`;
            const url = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
                ? chrome.runtime.getURL(templatePath)
                : templatePath;

            // 通过fetch加载模板
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const template = await response.text();

            // 缓存模板
            this.cache.set(templateName, template);
            return template;
        } catch (error) {
            console.error(`加载模板失败: ${templateName}`, error);
            // 返回默认模板或空字符串
            return this.getFallbackTemplate(templateName);
        }
    }

    /**
     * 获取默认模板（回退方案）
     * @param {string} templateName - 模板名称
     * @returns {string}
     */
    getFallbackTemplate(templateName) {
        const fallbackTemplates = {
            'main-panel': this.getMainPanelTemplate(),
            'settings-modal': this.getSettingsModalTemplate(),
            'toast-notification': this.getToastTemplate(),
            'score-panel': this.getScorePanelTemplate(),
            'dimensions-list': this.getDimensionsListTemplate(),
            'reason-panel': this.getReasonPanelTemplate()
        };

        return fallbackTemplates[templateName] || `<div>模板加载失败: ${templateName}</div>`;
    }

    /**
     * 主面板默认模板
     * @returns {string}
     */
    getMainPanelTemplate() {
        return `
            <div class="zhixue-ai-main-content">
                <div class="zhixue-ai-header">
                    <div class="zhixue-ai-logo">
                        <div class="zhixue-ai-logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 3.438 9.75 7.938 11.937.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 23.795 24 19.295 24 14c0-6.627-5.373-12-12-12z" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="zhixue-ai-logo-text">
                            <h1>AI智能阅卷助手</h1>
                        </div>
                    </div>
                    <div class="zhixue-ai-header-actions">
                        <button class="zhixue-ai-settings-btn" id="modelSettingsBtn" title="模型设置">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="zhixue-ai-close" id="closePanelBtn">&times;</button>
                    </div>
                </div>
                <div class="zhixue-ai-content">
                    <div class="zhixue-ai-card">
                        <div class="zhixue-ai-card-title">评分操作</div>
                        <div class="zhixue-ai-buttons">
                            <button class="zhixue-ai-button zhixue-ai-button-try" id="aiTrialBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>AI试评</span>
                            </button>
                            <button class="zhixue-ai-button zhixue-ai-button-auto" id="aiAutoGradeBtn">
                                <svg width="16" height="16" viewBox="0 0 24 24">
                                    <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>自动阅卷</span>
                            </button>
                        </div>
                    </div>
                    <div class="zhixue-ai-card">
                        <div class="zhixue-ai-card-title">评分结果</div>
                        <div class="zhixue-ai-score-box">
                            <div class="zhixue-ai-score-total">
                                <div class="zhixue-ai-score-number" id="scoreDisplay">0<span>/100</span></div>
                                <div class="zhixue-ai-score-label">总分</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 设置模态框默认模板
     * @returns {string}
     */
    getSettingsModalTemplate() {
        return `
            <div class="zhixue-ai-settings-overlay"></div>
            <div class="zhixue-ai-settings-content">
                <div class="zhixue-ai-settings-header">
                    <h3>模型设置</h3>
                    <button class="settings-close-btn" id="closeSettingsBtn">&times;</button>
                </div>
                <div class="zhixue-ai-settings-body">
                    <div class="settings-section">
                        <h4>API密钥配置</h4>
                        <div class="api-key-group">
                            <div class="api-key-item">
                                <label>OpenAI API Key</label>
                                <div class="api-key-input-group">
                                    <input type="password" id="openaiKeyInput" placeholder="输入OpenAI API密钥">
                                    <button class="test-provider-btn" data-provider="openai">测试</button>
                                    <div id="openai-status" class="status-indicator"></div>
                                </div>
                            </div>
                            <div class="api-key-item">
                                <label>Google API Key</label>
                                <div class="api-key-input-group">
                                    <input type="password" id="geminiKeyInput" placeholder="输入Google API密钥">
                                    <button class="test-provider-btn" data-provider="gemini">测试</button>
                                    <div id="gemini-status" class="status-indicator"></div>
                                </div>
                            </div>
                            <div class="api-key-item">
                                <label>阿里云 API Key</label>
                                <div class="api-key-input-group">
                                    <input type="password" id="qwenKeyInput" placeholder="输入阿里云API密钥">
                                    <button class="test-provider-btn" data-provider="qwen">测试</button>
                                    <div id="qwen-status" class="status-indicator"></div>
                                </div>
                            </div>
                            <div class="api-key-item">
                                <label>智谱AI API Key</label>
                                <div class="api-key-input-group">
                                    <input type="password" id="glmKeyInput" placeholder="输入智谱AI API密钥">
                                    <button class="test-provider-btn" data-provider="glm">测试</button>
                                    <div id="glm-status" class="status-indicator"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h4>模型优先级</h4>
                        <select id="modelPrioritySelect">
                            <option value="smart">智能切换（推荐）</option>
                            <option value="gpt4o">GPT-4o 优先</option>
                            <option value="gemini">Gemini 优先</option>
                            <option value="qwen">通义千问优先</option>
                            <option value="glm">GLM-4V 优先</option>
                        </select>
                    </div>
                </div>
                <div class="zhixue-ai-settings-footer">
                    <button id="testAllBtn">全部测试</button>
                    <button id="saveSettingsBtn">保存设置</button>
                </div>
            </div>
        `;
    }

    /**
     * Toast通知默认模板
     * @returns {string}
     */
    getToastTemplate() {
        return `
            <div class="zhixue-ai-toast">
                <div class="toast-content">
                    <div class="toast-icon"></div>
                    <span class="toast-message"></span>
                </div>
                <button class="toast-close">&times;</button>
            </div>
        `;
    }

    /**
     * 分数面板默认模板
     * @returns {string}
     */
    getScorePanelTemplate() {
        return `
            <div class="zhixue-ai-card">
                <div class="zhixue-ai-card-title">评分结果</div>
                <div class="zhixue-ai-score-box">
                    <div class="zhixue-ai-score-total">
                        <div class="zhixue-ai-score-number">--<span>/100</span></div>
                        <div class="zhixue-ai-score-label">总分</div>
                    </div>
                </div>
                <div class="zhixue-ai-dimensions"></div>
                <div class="zhixue-ai-model-info" style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #64748b; font-weight: 500;">使用模型</span>
                        <span class="zhixue-ai-model-used" style="font-size: 13px; color: #3b82f6; font-weight: 600;">--</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 13px; color: #64748b; font-weight: 500;">置信度</span>
                        <span class="zhixue-ai-confidence" style="font-size: 13px; color: #10b981; font-weight: 600;">--</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 维度列表默认模板
     * @returns {string}
     */
    getDimensionsListTemplate() {
        return `
            <div class="zhixue-ai-dimension" data-dimension="accuracy">
                <span class="zhixue-ai-dimension-name">观点明确</span>
                <span class="zhixue-ai-dimension-score">--/30</span>
                <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
            </div>
            <div class="zhixue-ai-dimension" data-dimension="completeness">
                <span class="zhixue-ai-dimension-name">史实准确</span>
                <span class="zhixue-ai-dimension-score">--/30</span>
                <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
            </div>
            <div class="zhixue-ai-dimension" data-dimension="logic">
                <span class="zhixue-ai-dimension-name">逻辑清晰</span>
                <span class="zhixue-ai-dimension-score">--/20</span>
                <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
            </div>
            <div class="zhixue-ai-dimension" data-dimension="norms">
                <span class="zhixue-ai-dimension-name">语言规范</span>
                <span class="zhixue-ai-dimension-score">--/20</span>
                <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
            </div>
        `;
    }

    /**
     * 理由面板默认模板
     * @returns {string}
     */
    getReasonPanelTemplate() {
        return `
            <div class="zhixue-ai-reasons">
                <h4>评分理由</h4>
                <div class="zhixue-ai-reason-item">
                    <span>概述</span>
                    <span class="zhixue-ai-reasons-overview">--</span>
                </div>
            </div>
        `;
    }

    /**
     * 清除模板缓存
     * @param {string} templateName - 要清除的模板名称，不传则清除所有
     */
    clearCache(templateName = null) {
        if (templateName) {
            this.cache.delete(templateName);
        } else {
            this.cache.clear();
        }
    }

    /**
     * 预加载模板
     * @param {string[]} templateNames - 要预加载的模板名称数组
     * @returns {Promise<void>}
     */
    async preload(templateNames) {
        const promises = templateNames.map(name => this.load(name));
        await Promise.allSettled(promises);
    }

    /**
     * 获取缓存统计信息
     * @returns {Object}
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 创建单例实例
export const templateLoader = new TemplateLoader();

// 兼容性导出函数
export async function loadTemplate(templateName) {
    return await templateLoader.load(templateName);
}

export function clearTemplateCache() {
    templateLoader.clearCache();
}

// 导出类
export default TemplateLoader;

function getDefaultTemplate(templateName) {
  const defaults = {
    'main-panel.html': `
      <div class="zhixue-ai-main-content">
        <div class="zhixue-ai-header">
          <div class="zhixue-ai-logo">
            <div class="zhixue-ai-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 3.438 9.75 7.938 11.937.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 23.795 24 19.295 24 14c0-6.627-5.373-12-12-12z" fill="currentColor"/></svg>
            </div>
            <div class="zhixue-ai-logo-text"><h1>AI智能阅卷助手</h1></div>
          </div>
          <div class="zhixue-ai-header-actions">
            <button class="zhixue-ai-settings-btn" id="modelSettingsBtn" title="模型设置">⚙️</button>
            <button class="zhixue-ai-close">&times;</button>
          </div>
        </div>
        <div class="zhixue-ai-content">
          <div class="zhixue-ai-card">
            <div class="zhixue-ai-card-title">评分操作</div>
            <div class="zhixue-ai-buttons">
              <button class="zhixue-ai-button zhixue-ai-button-try" id="aiTrialBtn">AI试评</button>
              <button class="zhixue-ai-button zhixue-ai-button-auto" id="aiAutoGradeBtn">自动阅卷</button>
            </div>
          </div>
          <div class="zhixue-ai-card">
            <div class="zhixue-ai-card-title">评分结果</div>
            <div class="zhixue-ai-score-box">
              <div class="zhixue-ai-score-total">
                <div class="zhixue-ai-score-number">85<span>/100</span></div>
                <div class="zhixue-ai-score-label">总分</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    'settings-modal.html': `
      <div class="zhixue-ai-settings-overlay"></div>
      <div class="zhixue-ai-settings-content">
        <div class="zhixue-ai-settings-header">
          <h3>模型设置</h3>
          <button class="settings-close-btn">&times;</button>
        </div>
        <div class="zhixue-ai-settings-body">
          <div class="settings-section">
            <h4>API密钥配置</h4>
            <div class="api-key-group">
              <div class="api-key-item">
                <label>OpenAI API Key</label>
                <div class="api-key-input-group">
                  <input type="password" id="openaiKeyInput" placeholder="输入OpenAI API密钥">
                  <button class="test-provider-btn" data-provider="openai">测试</button>
                  <div id="openai-status" class="status-indicator"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="zhixue-ai-settings-footer"><button id="saveSettingsBtn">保存设置</button></div>
      </div>
    `
    ,
    'score-panel.html': `
      <div class="zhixue-ai-card">
        <div class="zhixue-ai-card-title">评分结果</div>
        <div class="zhixue-ai-score-box">
          <div class="zhixue-ai-score-total">
            <div class="zhixue-ai-score-number">--<span>/100</span></div>
            <div class="zhixue-ai-score-label">总分</div>
          </div>
        </div>
        <div class="zhixue-ai-dimensions"></div>
        <div class="zhixue-ai-model-info" style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 13px; color: #64748b; font-weight: 500;">使用模型</span>
            <span class="zhixue-ai-model-used" style="font-size: 13px; color: #3b82f6; font-weight: 600;">--</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #64748b; font-weight: 500;">置信度</span>
            <span class="zhixue-ai-confidence" style="font-size: 13px; color: #10b981; font-weight: 600;">--</span>
          </div>
        </div>
      </div>
    `,
    'dimensions-list.html': `
      <div class="zhixue-ai-dimension" data-dimension="accuracy">
        <span class="zhixue-ai-dimension-name">观点明确</span>
        <span class="zhixue-ai-dimension-score">--/30</span>
        <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
      </div>
      <div class="zhixue-ai-dimension" data-dimension="completeness">
        <span class="zhixue-ai-dimension-name">史实准确</span>
        <span class="zhixue-ai-dimension-score">--/30</span>
        <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
      </div>
      <div class="zhixue-ai-dimension" data-dimension="logic">
        <span class="zhixue-ai-dimension-name">逻辑清晰</span>
        <span class="zhixue-ai-dimension-score">--/20</span>
        <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
      </div>
      <div class="zhixue-ai-dimension" data-dimension="norms">
        <span class="zhixue-ai-dimension-name">语言规范</span>
        <span class="zhixue-ai-dimension-score">--/20</span>
        <span class="zhixue-ai-dimension-comment" style="display:block;margin-top:6px;color:#64748b;font-size:12px;">评语：--</span>
      </div>
    `
    ,
    'reason-panel.html': `
      <div class="zhixue-ai-reasons">
        <h4>评分理由</h4>
        <div class="zhixue-ai-reason-item">
          <span>概述</span>
          <span class="zhixue-ai-reasons-overview">--</span>
        </div>
      </div>
    `
  };
  return defaults[templateName] || `<div>模板缺失: ${templateName}</div>`;
}

export function clearTemplateCache() {
  templateCache.clear();
}