const templateCache = new Map();

export async function loadTemplate(templateName) {
  if (templateCache.has(templateName)) return templateCache.get(templateName);

  try {
    const templatePath = `ui/templates/${templateName}`;
    const url = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL(templatePath)
      : null;

    if (url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      templateCache.set(templateName, text);
      return text;
    }
    // 非扩展环境下使用相对路径加载
    const res2 = await fetch(templatePath);
    if (res2 && res2.ok) {
      const text2 = await res2.text();
      templateCache.set(templateName, text2);
      return text2;
    }
  } catch (e) {
    // no-op, fallback below
  }

  const fallback = getDefaultTemplate(templateName);
  templateCache.set(templateName, fallback);
  return fallback;
}

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