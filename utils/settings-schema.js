const PROVIDERS = {
    openai: {
        id: 'openai',
        label: 'OpenAI',
        defaultModel: 'gpt-4o',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        storageKey: 'ai_keys_openai'
    },
    gemini: {
        id: 'gemini',
        label: 'Gemini',
        defaultModel: 'gemini-2.5-pro',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent',
        storageKey: 'ai_keys_gemini'
    },
    qwen: {
        id: 'qwen',
        label: 'Qwen',
        defaultModel: 'qwen-vl-plus',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        storageKey: 'ai_keys_qwen'
    },
    glm: {
        id: 'glm',
        label: 'GLM',
        defaultModel: 'glm-4v',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        storageKey: 'ai_keys_glm'
    }
};

const MODEL_DEFAULTS = {
    'gpt-4o': { temperature: 0.3, maxTokens: 2048, topP: 0.9, timeout: 60 },
    'gemini-2.5-pro': { temperature: 0.6, maxTokens: 4096, topK: 40, timeout: 60 },
    'qwen-vl-plus': { temperature: 0.7, maxTokens: 4000, topP: 0.8, timeout: 60 },
    'glm-4v': { temperature: 0.65, maxTokens: 4096, topP: 0.9, repetitionPenalty: 1.1, timeout: 60 }
};

const MODEL_IDS = Object.keys(MODEL_DEFAULTS);

const DEFAULT_SETTINGS = {
    defaultModel: 'gpt-4o',
    modelPriority: ['gpt-4o', 'gemini-2.5-pro', 'qwen-vl-plus', 'glm-4v'],
    drawerWidth: 360,
    autoSave: true,
    debugMode: false,
    modelParams: MODEL_DEFAULTS,
    providers: Object.fromEntries(
        Object.entries(PROVIDERS).map(([id, meta]) => [id, { endpoint: meta.endpoint }])
    )
};

const structuredCloneSafe = (obj) => JSON.parse(JSON.stringify(obj));

function mergeSettings(base, patch = {}) {
    const result = structuredCloneSafe(base || DEFAULT_SETTINGS);

    if (typeof patch.defaultModel === 'string' && MODEL_IDS.includes(patch.defaultModel)) {
        result.defaultModel = patch.defaultModel;
    }

    if (Array.isArray(patch.modelPriority) && patch.modelPriority.length) {
        const filtered = patch.modelPriority.filter((id) => MODEL_IDS.includes(id));
        result.modelPriority = filtered.length ? filtered : [...result.modelPriority];
    }

    if (patch.providers) {
        result.providers = { ...result.providers };
        Object.entries(patch.providers).forEach(([provider, config]) => {
            result.providers[provider] = {
                ...result.providers[provider],
                ...config
            };
        });
    }

    if (patch.modelParams) {
        result.modelParams = { ...result.modelParams };
        Object.entries(patch.modelParams).forEach(([modelId, params]) => {
            if (!MODEL_IDS.includes(modelId)) return;
            result.modelParams[modelId] = {
                ...result.modelParams[modelId],
                ...params
            };
        });
    }

    if (typeof patch.drawerWidth === 'number' && !Number.isNaN(patch.drawerWidth)) {
        const clamped = Math.min(Math.max(patch.drawerWidth, 280), 600);
        result.drawerWidth = clamped;
    }

    if (typeof patch.autoSave === 'boolean') {
        result.autoSave = patch.autoSave;
    }

    if (typeof patch.debugMode === 'boolean') {
        result.debugMode = patch.debugMode;
    }

    return result;
}

function normalizeSettings(settings = {}) {
    return mergeSettings(DEFAULT_SETTINGS, settings);
}

function cloneDefaultSettings() {
    return structuredCloneSafe(DEFAULT_SETTINGS);
}

export {
    PROVIDERS,
    MODEL_IDS,
    MODEL_DEFAULTS,
    DEFAULT_SETTINGS,
    mergeSettings,
    normalizeSettings,
    cloneDefaultSettings
};
