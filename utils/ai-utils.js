/**
 * AI Utilities: prompt building and response parsing
 */

export function buildScoringPrompt(questionText, maxScore = 100) {
  const q = (questionText || '请根据图片中的答案进行评分').slice(0, 800);
  return `你是一位经验丰富的教师，请根据题目与答题图片进行评分。
满分为${maxScore}分。题目如下：
${q}

请仅返回JSON（不要包含任何多余文字、注释、标记或代码块），格式如下：
{
  "score": 0-100 的整数,
  "maxScore": ${maxScore},
  "confidence": 0.0-1.0 的小数,
  "reasoning": "简要评分理由",
  "dimensions": {
    "accuracy": { "score": 0-30, "maxScore": 30, "comment": "..." },
    "completeness": { "score": 0-30, "maxScore": 30, "comment": "..." },
    "logic": { "score": 0-20, "maxScore": 20, "comment": "..." },
    "norms": { "score": 0-20, "maxScore": 20, "comment": "..." }
  }
}

注意：
- 只输出JSON，不要输出任何解释或其他内容。`;
}

/**
 * 根据模板构建提示词
 * 支持占位符：
 *  - {{question}} 题目文本
 *  - {{maxScore}} 满分
 * 可选: 当 forceJSON 为真时，会追加严格JSON输出要求（若模板中未包含）
 */
export function buildScoringPromptFromTemplate(template, questionText, maxScore = 100, forceJSON = true) {
  const base = (template || '').trim();
  if (!base) return buildScoringPrompt(questionText, maxScore);
  const q = (questionText || '请根据图片中的答案进行评分').slice(0, 2000);
  let out = base
    .replace(/\{\{\s*question\s*\}\}/g, q)
    .replace(/\{\{\s*maxScore\s*\}\}/g, String(maxScore));

  const hasJsonHint = /\"score\"|只输出JSON|仅返回JSON/.test(out);
  if (forceJSON && !hasJsonHint) {
    out += `

请仅返回JSON（不要包含任何多余文字、注释、标记或代码块），包含至少以下字段：
{ "score": 0-${maxScore} 的整数, "maxScore": ${maxScore}, "confidence": 0.0-1.0, "reasoning": "..." }`;
  }
  return out;
}

export function parseScoringResponse(text, maxScore = 100) {
  const json = tryParseJSON(text);
  if (json) {
    const score = clampInt(json.score, 0, maxScore, Math.round(maxScore * 0.75));
    const confidence = clampFloat(json.confidence, 0, 1, 0.85);
    const reasoning = typeof json.reasoning === 'string' && json.reasoning.trim() ? json.reasoning.trim() : '评分完成';
    return { score, confidence, reasoning, dimensions: json.dimensions || {} };
  }
  const numMatches = (text || '').match(/(\d{1,3})\s*分?/);
  let score = Math.min(maxScore, Math.max(0, parseInt(numMatches?.[1] || '0', 10)));
  if (!Number.isFinite(score) || score === 0) {
    score = Math.round(maxScore * 0.75);
  }
  return { score, confidence: 0.85, reasoning: text || '评分完成' };
}

export function safeExtractTextFromChoices(raw) {
  try {
    if (raw?.choices?.[0]?.message?.content) {
      const content = raw.choices[0].message.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        const parts = content.filter(p => p?.type === 'text').map(p => p.text).join('\n');
        if (parts) return parts;
      }
    }
    if (raw?.output?.choices?.[0]?.message?.content) {
      const arr = raw.output.choices[0].message.content;
      if (Array.isArray(arr)) {
        const text = arr.map(p => (p?.text || '')).join('\n').trim();
        if (text) return text;
      }
    }
    if (raw?.choices?.[0]?.message?.content) {
      const arr = raw.choices[0].message.content;
      if (Array.isArray(arr)) {
        const text = arr.map(p => (p?.text || '')).join('\n').trim();
        if (text) return text;
      }
    }
  } catch {}
  return '';
}

export function tryParseJSON(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    return (typeof obj === 'object' && obj) ? obj : null;
  } catch {
    return null;
  }
}

export function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return fallback;
}

export function clampFloat(v, min, max, fallback) {
  const n = parseFloat(v);
  if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  return fallback;
}
