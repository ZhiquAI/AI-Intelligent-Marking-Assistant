// Provider diagnostics utilities for background service worker
import { decrypt } from './security-utils.js';

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

export async function testAllProviders() {
  const providers = ['openai', 'gemini', 'qwen', 'glm'];
  const out = [];
  for (const p of providers) {
    try {
      const r = await testProvider(p);
      out.push(r);
    } catch (e) {
      out.push({ provider: p, ok: false, hasKey: false, message: e.message });
    }
  }
  return out;
}

export async function testProvider(provider) {
  const apiKey = await getDecryptedApiKey(provider);
  if (!apiKey) return { provider, ok: false, hasKey: false, message: '未配置密钥' };

  switch (provider) {
    case 'openai':
      return await testOpenAI(apiKey);
    case 'gemini':
      return await testGemini(apiKey);
    case 'qwen':
      return await testQwen(apiKey);
    case 'glm':
      return await testGLM(apiKey);
    default:
      return { provider, ok: false, hasKey: true, message: '未知提供商' };
  }
}

export async function testOpenAI(apiKey) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  const start = Date.now();
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal
    });
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    let bytes = 0;
    try { const txt = await res.clone().text(); bytes = new TextEncoder().encode(txt).length; } catch {}
    if (res.ok) return { provider: 'openai', ok: true, hasKey: true, message: '鉴权通过', latencyMs, bytes };
    return { provider: 'openai', ok: false, hasKey: true, message: `HTTP ${res.status}`, latencyMs, bytes };
  } catch (e) {
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    return { provider: 'openai', ok: false, hasKey: true, message: e.name === 'AbortError' ? '超时' : e.message, latencyMs };
  }
}

export async function testGemini(apiKey) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  const start = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    let bytes = 0;
    try { const txt = await res.clone().text(); bytes = new TextEncoder().encode(txt).length; } catch {}
    if (res.ok) return { provider: 'gemini', ok: true, hasKey: true, message: '鉴权通过', latencyMs, bytes };
    return { provider: 'gemini', ok: false, hasKey: true, message: `HTTP ${res.status}`, latencyMs, bytes };
  } catch (e) {
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    return { provider: 'gemini', ok: false, hasKey: true, message: e.name === 'AbortError' ? '超时' : e.message, latencyMs };
  }
}

export async function testQwen(apiKey) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  const start = Date.now();
  try {
    const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    const body = {
      model: 'qwen-vl-plus',
      input: { messages: [{ role: 'user', content: [{ text: 'ping' }] }] },
      parameters: { result_format: 'text' }
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    let bytes = 0;
    try { const txt = await res.clone().text(); bytes = new TextEncoder().encode(txt).length; } catch {}
    if (res.ok) return { provider: 'qwen', ok: true, hasKey: true, message: '鉴权通过', latencyMs, bytes };
    return { provider: 'qwen', ok: false, hasKey: true, message: `HTTP ${res.status}`, latencyMs, bytes };
  } catch (e) {
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    return { provider: 'qwen', ok: false, hasKey: true, message: e.name === 'AbortError' ? '超时' : e.message, latencyMs };
  }
}

export async function testGLM(apiKey) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  const start = Date.now();
  try {
    const endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const body = {
      model: 'glm-4v',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'ping' }] }],
      max_tokens: 10,
      temperature: 0
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    let bytes = 0;
    try { const txt = await res.clone().text(); bytes = new TextEncoder().encode(txt).length; } catch {}
    if (res.ok) return { provider: 'glm', ok: true, hasKey: true, message: '鉴权通过', latencyMs, bytes };
    return { provider: 'glm', ok: false, hasKey: true, message: `HTTP ${res.status}`, latencyMs, bytes };
  } catch (e) {
    clearTimeout(t);
    const latencyMs = Date.now() - start;
    return { provider: 'glm', ok: false, hasKey: true, message: e.name === 'AbortError' ? '超时' : e.message, latencyMs };
  }
}

