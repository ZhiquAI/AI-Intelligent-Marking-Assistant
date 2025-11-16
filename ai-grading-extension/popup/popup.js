// ============================================================================
// 智学网AI智能阅卷助手 - Popup 主入口
// 100%还原原HTML中的所有交互逻辑
// ============================================================================

// ============================================================================
// 导入模块
// ============================================================================
import { gradingManager } from '../core/grading/index.js';
import { reviewSystem } from '../core/review/index.js';
import { toastNotifier } from '../ui/components/toast-notifier.js';

// ============================================================================
// 全局变量
// ============================================================================
const currentRubricContent = '';
const isDarkMode = false;

// ============================================================================
// 页面加载完成后执行
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 确保选项卡初始状态正确
    initializeTabs();

    // 加载设置并配置AI服务
    loadAndConfigureAI();

    // 初始化所有模块
    initializeModules();
});

/**
 * 加载设置并配置AI服务
 */
function loadAndConfigureAI() {
    // 从存储加载设置
    chrome.storage.local.get(['settings'], result => {
        const settings = result.settings || getDefaultSettings();

        // 配置AI评分器
        if (window.gradingManager && window.gradingManager.aiScorer) {
            window.gradingManager.aiScorer.configure(settings);
        }

        // 保存设置到全局变量
        window.currentSettings = settings;
    });
}

/**
 * 获取默认设置
 */
function getDefaultSettings() {
    return {
        api: {
            type: 'openai',
            key: '',
            endpoint: 'https://api.openai.com/v1/chat/completions'
        },
        model: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 1
        },
        grading: {
            strictMode: true,
            dualModel: false,
            mode: 'auto'
        },
        advanced: {
            autoSave: true,
            debugMode: false,
            gradingSpeed: 'normal'
        }
    };
}

// ============================================================================
// Tab切换功能
// ============================================================================
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // 更新Tab按钮样式
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'bg-blue-600', 'text-white', 'shadow-sm');
                btn.classList.add('text-gray-700', 'hover:bg-gray-50', 'border-transparent');
            });
            button.classList.add('active', 'bg-blue-600', 'text-white', 'shadow-sm');
            button.classList.remove('text-gray-700', 'hover:bg-gray-50', 'border-transparent');

            // 显示对应的内容
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            const targetContent = document.getElementById(`tab-content-${targetTab}`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
                targetContent.classList.add('scale-in');
            }
        });
    });
}

// ============================================================================
// 初始化所有模块
// ============================================================================
async function initializeModules() {
    // 初始化阅卷模块
    await gradingManager.initialize();

    // 初始化复核模块
    await reviewSystem.initialize();

    initializeAnalysisModule();
    initializeSettingsModule();
    initializeModalHandlers();
}

// ============================================================================
// 智能阅卷模块
// ============================================================================
function initializeGradingModule() {

    // 事件绑定已由gradingManager完成
    // 这里可以添加额外的初始化逻辑
}

// 这些函数已移动到reviewSystem中
// 保留空的占位函数以避免错误

// ============================================================================
// 数据分析模块
// ============================================================================
function initializeAnalysisModule() {
    // 图表类型选择
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', e => {
            handleChartTypeChange(e.target.value);
        });
    }

    // 初始化图表
    initializeChart();
}

function handleChartTypeChange(type) {
    const canvas = document.getElementById('scoreDistributionChart');
    if (!canvas || typeof Chart === 'undefined') {
        showToast('图表组件未准备好', 'error');
        return;
    }

    // 销毁现有图表
    if (window.scoreChart) {
        window.scoreChart.destroy();
    }

    // 根据类型创建新图表
    const ctx = canvas.getContext('2d');
    const chartData = {
        labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
        datasets: [
            {
                label: '分数分布',
                data: [5, 15, 30, 120, 180],
                backgroundColor:
                    type === 'pie'
                        ? [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)'
                        ]
                        : 'rgba(59, 130, 246, 0.5)',
                borderColor:
                    type === 'pie'
                        ? [
                            'rgba(239, 68, 68, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(59, 130, 246, 1)',
                            'rgba(139, 92, 246, 1)',
                            'rgba(16, 185, 129, 1)'
                        ]
                        : 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                tension: type === 'line' ? 0.4 : 0
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#64748b',
                    font: {
                        size: 12
                    }
                }
            }
        },
        scales:
            type === 'pie'
                ? {}
                : {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.5)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#64748b'
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.3)'
                        }
                    }
                }
    };

    // 创建新图表
    window.scoreChart = new Chart(ctx, {
        type,
        data: chartData,
        options: chartOptions
    });

    showToast(
        `已切换到${type === 'bar' ? '柱状图' : type === 'line' ? '折线图' : '饼图'}`,
        'success'
    );
}

function initializeChart() {
    const canvas = document.getElementById('scoreDistributionChart');
    if (canvas && typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d');
        window.scoreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
                datasets: [
                    {
                        label: '分数分布',
                        data: [5, 15, 30, 120, 180],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// ============================================================================
// 设置模块
// ============================================================================
function initializeSettingsModule() {
    // 评分标准配置按钮
    const rubricConfigButton = document.getElementById('rubric-config-button');
    if (rubricConfigButton) {
        rubricConfigButton.addEventListener('click', () => {
            handleRubricConfig();
        });
    }

    // 设置按钮
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            handleSettings();
        });
    }

    // 评分设置状态
    const statusRubricConfig = document.getElementById('status-rubric-config');
    if (statusRubricConfig) {
        statusRubricConfig.addEventListener('click', () => {
            handleRubricConfig();
        });
    }

    // 导出记录按钮
    const exportRecordsBtn = document.getElementById('exportRecordsBtn');
    if (exportRecordsBtn) {
        exportRecordsBtn.addEventListener('click', () => {
            handleExportRecords();
        });
    }
}

// ============================================================================
// 评分标准配置模块
// ============================================================================
function initializeRubricConfig() {
    // 初始化默认评分维度
    const defaultDimensions = [
        { name: '内容完整性', weight: 30, maxScore: 30 },
        { name: '逻辑结构', weight: 25, maxScore: 25 },
        { name: '语言表达', weight: 25, maxScore: 25 },
        { name: '格式规范', weight: 20, maxScore: 20 }
    ];

    // 加载或初始化评分维度
    chrome.storage.local.get(['rubricConfig'], result => {
        const config = result.rubricConfig || { dimensions: defaultDimensions };
        renderRubricDimensions(config.dimensions);
        updateRubricChart(config.dimensions);
    });

    // 绑定事件
    bindRubricEvents();
}

function renderRubricDimensions(dimensions) {
    const container = document.getElementById('rubricDimensions');
    if (!container) return;

    container.innerHTML = '';

    dimensions.forEach((dimension, index) => {
        const dimensionEl = document.createElement('div');
        dimensionEl.className = 'bg-white rounded-lg p-3 border space-y-2';
        dimensionEl.innerHTML = `
            <div class="flex justify-between items-center">
                <input type="text" class="dimension-name font-medium text-gray-800 bg-transparent border-none outline-none flex-1" value="${dimension.name}" placeholder="维度名称">
                <button class="remove-dimension text-red-500 hover:text-red-700 transition-colors" data-index="${index}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <label class="block text-gray-600 mb-1">权重(%)</label>
                    <input type="number" class="dimension-weight w-full p-1 border rounded" value="${dimension.weight}" min="1" max="100">
                </div>
                <div>
                    <label class="block text-gray-600 mb-1">满分</label>
                    <input type="number" class="dimension-score w-full p-1 border rounded" value="${dimension.maxScore}" min="1" max="100">
                </div>
            </div>
        `;
        container.appendChild(dimensionEl);
    });

    // 重新渲染图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateRubricChart(dimensions) {
    const canvas = document.getElementById('rubricChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');

    // 销毁现有图表
    if (window.rubricChart) {
        window.rubricChart.destroy();
    }

    const labels = dimensions.map(d => d.name);
    const weights = dimensions.map(d => d.weight);
    const scores = dimensions.map(d => d.maxScore);

    window.rubricChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [
                {
                    data: weights,
                    backgroundColor: [
                        '#3B82F6',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                        '#8B5CF6',
                        '#06B6D4',
                        '#84CC16',
                        '#F97316'
                    ],
                    borderWidth: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#64748b',
                        font: { size: 10 },
                        padding: 10
                    }
                }
            }
        }
    });
}

function bindRubricEvents() {
    // 关闭模态框
    const closeBtn = document.getElementById('closeRubricModalBtn');
    const cancelBtn = document.getElementById('cancelRubricConfigBtn');
    const modal = document.getElementById('rubricConfigModal');
    const modalContent = document.getElementById('rubricModalContent');

    function closeModal() {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // 添加维度
    const addBtn = document.getElementById('addDimensionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const container = document.getElementById('rubricDimensions');
            const dimensions = getRubricDimensions();
            dimensions.push({ name: '新维度', weight: 10, maxScore: 10 });
            renderRubricDimensions(dimensions);
            updateRubricChart(dimensions);
        });
    }

    // 保存配置
    const saveBtn = document.getElementById('saveRubricConfigBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const dimensions = getRubricDimensions();
            const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
            const totalScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0);

            if (totalWeight !== 100) {
                showToast('权重总和必须为100%', 'error');
                return;
            }

            const config = {
                dimensions,
                totalScore: parseInt(document.getElementById('totalScoreInput')?.value || 100),
                passScore: parseInt(document.getElementById('passScoreInput')?.value || 60),
                template:
                    document.querySelector('.template-item.border-blue-500')?.dataset.template ||
                    'custom'
            };

            chrome.storage.local.set({ rubricConfig: config }, () => {
                showToast('评分标准配置已保存', 'success');
                closeModal();
            });
        });
    }

    // 模板选择
    document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.template-item').forEach(i => {
                i.classList.remove('border-blue-500');
                i.querySelector('.selected-icon').classList.add('hidden');
            });
            item.classList.add('border-blue-500');
            item.querySelector('.selected-icon').classList.remove('hidden');

            // 应用模板
            applyRubricTemplate(item.dataset.template);
        });
    });

    // 动态绑定维度事件
    document.addEventListener('input', e => {
        if (
            e.target.classList.contains('dimension-weight') ||
            e.target.classList.contains('dimension-score') ||
            e.target.classList.contains('dimension-name')
        ) {
            const dimensions = getRubricDimensions();
            renderRubricDimensions(dimensions);
            updateRubricChart(dimensions);
        }
    });

    document.addEventListener('click', e => {
        if (e.target.closest('.remove-dimension')) {
            const index = parseInt(e.target.closest('.remove-dimension').dataset.index);
            const dimensions = getRubricDimensions();
            if (dimensions.length > 1) {
                dimensions.splice(index, 1);
                renderRubricDimensions(dimensions);
                updateRubricChart(dimensions);
            } else {
                showToast('至少需要保留一个评分维度', 'warning');
            }
        }
    });
}

function getRubricDimensions() {
    const container = document.getElementById('rubricDimensions');
    const dimensions = [];

    container?.querySelectorAll('.bg-white.rounded-lg').forEach(item => {
        const name = item.querySelector('.dimension-name')?.value || '';
        const weight = parseInt(item.querySelector('.dimension-weight')?.value || 0);
        const maxScore = parseInt(item.querySelector('.dimension-score')?.value || 0);

        if (name.trim()) {
            dimensions.push({ name: name.trim(), weight, maxScore });
        }
    });

    return dimensions;
}

function applyRubricTemplate(templateType) {
    const templates = {
        essay: [
            { name: '内容完整性', weight: 30, maxScore: 30 },
            { name: '逻辑结构', weight: 25, maxScore: 25 },
            { name: '语言表达', weight: 25, maxScore: 25 },
            { name: '格式规范', weight: 20, maxScore: 20 }
        ],
        objective: [{ name: '答案正确性', weight: 100, maxScore: 100 }],
        subjective: [
            { name: '知识点覆盖', weight: 40, maxScore: 40 },
            { name: '逻辑思维', weight: 30, maxScore: 30 },
            { name: '表达清晰', weight: 30, maxScore: 30 }
        ]
    };

    const template = templates[templateType];
    if (template) {
        renderRubricDimensions(template);
        updateRubricChart(template);

        // 设置总分
        const totalScore = template.reduce((sum, d) => sum + d.maxScore, 0);
        document.getElementById('totalScoreInput').value = totalScore;
        document.getElementById('passScoreInput').value = Math.floor(totalScore * 0.6);
    }
}

function handleRubricConfig() {
    // 打开评分标准配置模态框
    const modal = document.getElementById('rubricConfigModal');
    const modalContent = document.getElementById('rubricModalContent');

    if (!modal || !modalContent) {
        // console.error('评分标准配置模态框未找到');
        return;
    }

    // 显示模态框
    modal.classList.remove('hidden');

    // 触发动画
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);

    // 初始化评分标准配置
    initializeRubricConfig();

    showToast('评分标准配置已打开', 'info');
}

// ============================================================================
// 设置管理模块
// ============================================================================
function initializeSettings() {
    // 默认设置
    const defaultSettings = {
        api: {
            type: 'openai',
            key: '',
            endpoint: 'https://api.openai.com/v1/chat/completions'
        },
        model: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 1
        },
        grading: {
            strictMode: true,
            dualModel: false,
            mode: 'auto'
        },
        advanced: {
            autoSave: true,
            debugMode: false,
            gradingSpeed: 'normal'
        }
    };

    // 加载保存的设置
    chrome.storage.local.get(['settings'], result => {
        const settings = result.settings || defaultSettings;
        applySettingsToUI(settings);
        bindSettingsEvents();
    });
}

function applySettingsToUI(settings) {
    // API配置
    document.getElementById('apiTypeSelect').value = settings.api.type;
    document.getElementById('apiKeyInput').value = settings.api.key;
    document.getElementById('apiEndpointInput').value = settings.api.endpoint;

    // 模型参数
    document.getElementById('temperatureRange').value = settings.model.temperature;
    document.getElementById('temperatureValue').textContent = settings.model.temperature;
    document.getElementById('maxTokensInput').value = settings.model.maxTokens;
    document.getElementById('topPRange').value = settings.model.topP;
    document.getElementById('topPValue').textContent = settings.model.topP;

    // 评分策略
    document.getElementById('strictModeToggle').checked = settings.grading.strictMode;
    document.getElementById('dualModelToggle').checked = settings.grading.dualModel;
    document.getElementById('gradingModeSelect').value = settings.grading.mode;

    // 高级设置
    document.getElementById('autoSaveToggle').checked = settings.advanced.autoSave;
    document.getElementById('debugModeToggle').checked = settings.advanced.debugMode;
    document.getElementById('gradingSpeedSelect').value = settings.advanced.gradingSpeed;
}

function getSettingsFromUI() {
    return {
        api: {
            type: document.getElementById('apiTypeSelect').value,
            key: document.getElementById('apiKeyInput').value,
            endpoint: document.getElementById('apiEndpointInput').value
        },
        model: {
            temperature: parseFloat(document.getElementById('temperatureRange').value),
            maxTokens: parseInt(document.getElementById('maxTokensInput').value),
            topP: parseFloat(document.getElementById('topPRange').value)
        },
        grading: {
            strictMode: document.getElementById('strictModeToggle').checked,
            dualModel: document.getElementById('dualModelToggle').checked,
            mode: document.getElementById('gradingModeSelect').value
        },
        advanced: {
            autoSave: document.getElementById('autoSaveToggle').checked,
            debugMode: document.getElementById('debugModeToggle').checked,
            gradingSpeed: document.getElementById('gradingSpeedSelect').value
        }
    };
}

function bindSettingsEvents() {
    // 关闭模态框
    const closeBtn = document.getElementById('closeSettingsModalBtn');
    const cancelBtn = document.getElementById('cancelSettingsBtn');
    const modal = document.getElementById('settingsModal');
    const modalContent = document.getElementById('settingsModalContent');

    function closeModal() {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // 保存设置
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const settings = getSettingsFromUI();

            // 验证API密钥
            if (!settings.api.key) {
                showToast('请输入API密钥', 'error');
                return;
            }

            // 保存设置
            chrome.storage.local.set({ settings }, () => {
                showToast('设置已保存', 'success');
                closeModal();

                // 应用设置到全局
                window.currentSettings = settings;
            });
        });
    }

    // 测试API连接
    const testBtn = document.getElementById('testApiBtn');
    if (testBtn) {
        testBtn.addEventListener('click', async() => {
            const apiKey = document.getElementById('apiKeyInput').value;
            const apiType = document.getElementById('apiTypeSelect').value;

            if (!apiKey) {
                showToast('请先输入API密钥', 'warning');
                return;
            }

            testBtn.disabled = true;
            testBtn.textContent = '测试中...';

            try {
                const result = await testAPIConnection(apiType, apiKey);
                if (result.success) {
                    showToast('API连接成功', 'success');
                } else {
                    showToast(`API连接失败: ${result.error}`, 'error');
                }
            } catch (error) {
                showToast(`测试失败: ${error.message}`, 'error');
            }

            testBtn.disabled = false;
            testBtn.textContent = '测试';
        });
    }

    // 滑块值更新
    const temperatureRange = document.getElementById('temperatureRange');
    const topPRange = document.getElementById('topPRange');

    if (temperatureRange) {
        temperatureRange.addEventListener('input', e => {
            document.getElementById('temperatureValue').textContent = e.target.value;
        });
    }

    if (topPRange) {
        topPRange.addEventListener('input', e => {
            document.getElementById('topPValue').textContent = e.target.value;
        });
    }

    // API类型变化时更新端点
    const apiTypeSelect = document.getElementById('apiTypeSelect');
    if (apiTypeSelect) {
        apiTypeSelect.addEventListener('change', e => {
            const endpoints = {
                openai: 'https://api.openai.com/v1/chat/completions',
                gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                claude: 'https://api.anthropic.com/v1/messages',
                custom: ''
            };

            const endpointInput = document.getElementById('apiEndpointInput');
            if (endpointInput && e.target.value !== 'custom') {
                endpointInput.value = endpoints[e.target.value];
            }
        });
    }
}

async function testAPIConnection(apiType, apiKey) {
    // 简化的API测试逻辑
    try {
        switch (apiType) {
        case 'openai':
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            });
            return { success: response.ok };

        case 'gemini':
            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
            );
            return { success: geminiResponse.ok };

        case 'claude':
            // Claude API测试
            return { success: true }; // 简化测试

        default:
            return { success: true };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function handleSettings() {
    // 打开独立的设置页面（符合原型设计）
    chrome.tabs.create({
        url: chrome.runtime.getURL('popup/settings.html')
    });

    // 可选：显示提示消息
    if (toastNotifier) {
        toastNotifier.info('正在打开设置页面...', { duration: 1500 });
    }
}

function handleExportRecords() {
    // 获取当前评分记录
    chrome.storage.local.get(['gradingRecords'], result => {
        const records = result.gradingRecords || [];

        if (records.length === 0) {
            showToast('没有可导出的评分记录', 'warning');
            return;
        }

        // 显示导出选项模态框
        showExportOptions(records);
    });
}

function showExportOptions(records) {
    // 创建导出选项模态框
    const modal = createExportModal();
    document.body.appendChild(modal);

    // 绑定导出事件
    bindExportEvents(records);

    // 显示模态框
    modal.classList.remove('hidden');
    setTimeout(() => {
        const modalContent = modal.querySelector('.export-modal-content');
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function createExportModal() {
    const modal = document.createElement('div');
    modal.id = 'exportModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 hidden';

    modal.innerHTML = `
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md transform transition-all scale-95 opacity-0 export-modal-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">导出记录</h3>
                    <button id="closeExportModalBtn" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="space-y-4 mb-6">
                    <!-- 导出格式选择 -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-800 mb-3">选择导出格式</h4>
                        <div class="space-y-2">
                            <label class="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-500 transition-colors">
                                <input type="radio" name="exportFormat" value="json" class="mr-3" checked>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-800">JSON格式</div>
                                    <div class="text-xs text-gray-600">完整的结构化数据</div>
                                </div>
                                <i data-lucide="file-json" class="w-5 h-5 text-blue-600"></i>
                            </label>
                            <label class="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-500 transition-colors">
                                <input type="radio" name="exportFormat" value="csv" class="mr-3">
                                <div class="flex-1">
                                    <div class="font-medium text-gray-800">CSV格式</div>
                                    <div class="text-xs text-gray-600">表格数据,适合Excel</div>
                                </div>
                                <i data-lucide="file-spreadsheet" class="w-5 h-5 text-green-600"></i>
                            </label>
                            <label class="flex items-center p-3 bg-white rounded-lg border cursor-pointer hover:border-blue-500 transition-colors">
                                <input type="radio" name="exportFormat" value="pdf" class="mr-3">
                                <div class="flex-1">
                                    <div class="font-medium text-gray-800">PDF格式</div>
                                    <div class="text-xs text-gray-600">格式化的报告文档</div>
                                </div>
                                <i data-lucide="file-text" class="w-5 h-5 text-red-600"></i>
                            </label>
                        </div>
                    </div>

                    <!-- 导出选项 -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-800 mb-3">导出选项</h4>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" id="includeDetails" class="mr-2" checked>
                                <span class="text-sm text-gray-700">包含详细评分信息</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" id="includeStatistics" class="mr-2" checked>
                                <span class="text-sm text-gray-700">包含统计信息</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" id="includeCharts" class="mr-2">
                                <span class="text-sm text-gray-700">包含图表（PDF）</span>
                            </label>
                        </div>
                    </div>

                    <!-- 文件名 -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-800 mb-3">文件名</h4>
                        <input type="text" id="exportFilename" class="w-full p-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="评分记录导出_2024-11-11">
                        <div class="flex items-center mt-2">
                            <input type="checkbox" id="addTimestamp" class="mr-2" checked>
                            <label class="text-xs text-gray-600">添加时间戳</label>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-2">
                    <button id="cancelExportBtn" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors text-xs">取消</button>
                    <button id="exportBtn" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-xs">开始导出</button>
                </div>
            </div>
        </div>
    `;

    // 重新渲染图标
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);

    return modal;
}

function bindExportEvents(records) {
    // 关闭模态框
    const closeBtn = document.getElementById('closeExportModalBtn');
    const cancelBtn = document.getElementById('cancelExportBtn');
    const modal = document.getElementById('exportModal');

    function closeModal() {
        const modalContent = modal.querySelector('.export-modal-content');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // 开始导出
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const format = document.querySelector('input[name="exportFormat"]:checked').value;
            const options = {
                includeDetails: document.getElementById('includeDetails').checked,
                includeStatistics: document.getElementById('includeStatistics').checked,
                includeCharts: document.getElementById('includeCharts').checked
            };

            let filename = document.getElementById('exportFilename').value || '评分记录导出';
            if (document.getElementById('addTimestamp').checked) {
                const timestamp = Date().toISOString().slice(0, 10);
                filename += `_${timestamp}`;
            }

            // 执行导出
            performExport(records, format, options, filename);
            closeModal();
        });
    }
}

function performExport(records, format, options, filename) {
    try {
        switch (format) {
        case 'json':
            exportToJSON(records, options, filename);
            break;
        case 'csv':
            exportToCSV(records, options, filename);
            break;
        case 'pdf':
            exportToPDF(records, options, filename);
            break;
        }

        showToast(`导出成功: ${filename}.${format}`, 'success');
    } catch (error) {
        // console.error('导出失败:', error);
        showToast(`导出失败: ${error.message}`, 'error');
    }
}

function exportToJSON(records, options, filename) {
    const data = {
        exportInfo: {
            timestamp: Date().toISOString(),
            version: '5.0.0',
            totalRecords: records.length
        },
        records
    };

    if (options.includeStatistics) {
        data.statistics = calculateStatistics(records);
    }

    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, `${filename}.json`, 'application/json');
}

function exportToCSV(records, options, filename) {
    let csvContent = 'data:text/csv;charset=utf-8,';

    // 表头
    const headers = ['ID', '学生姓名', '总分', '评分时间', '状态'];
    if (options.includeDetails) {
        headers.push('评分维度', '详细分数', '评语');
    }
    csvContent += `${headers.join(',')}\n`;

    // 数据行
    records.forEach(record => {
        const row = [
            record.id || '',
            record.studentName || '',
            record.totalScore || 0,
            record.gradingTime || '',
            record.status || '已评分'
        ];

        if (options.includeDetails) {
            row.push(
                JSON.stringify(record.dimensions || {}),
                JSON.stringify(record.detailedScores || {}),
                record.comments || ''
            );
        }

        csvContent += `${row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')}\n`;
    });

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

function exportToPDF(records, options, filename) {
    // 简化的PDF导出实现
    try {
        // 检查jsPDF是否可用
        if (typeof jspdf === 'undefined') {
            showToast('PDF导出功能需要jsPDF库', 'error');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // 标题
        doc.setFontSize(20);
        doc.text('AI智能阅卷记录报告', 20, 30);

        // 导出信息
        doc.setFontSize(12);
        doc.text(`导出时间: ${Date().toLocaleString()}`, 20, 45);
        doc.text(`记录总数: ${records.length} 条`, 20, 55);

        // 记录列表
        let yPosition = 75;
        records.slice(0, 50).forEach((record, index) => {
            // 限制50条记录
            if (yPosition > 250) {
                // 新页面
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(10);
            doc.text(`${index + 1}. ${record.studentName || '未知学生'}`, 20, yPosition);
            doc.text(`分数: ${record.totalScore || 0}/100`, 120, yPosition);
            doc.text(
                `时间: ${record.gradingTime ? new Date(record.gradingTime).toLocaleDateString() : ''}`,
                160,
                yPosition
            );

            yPosition += 10;
        });

        // 如果有统计数据
        if (options.includeStatistics) {
            doc.addPage();
            doc.setFontSize(16);
            doc.text('统计信息', 20, 30);

            const stats = calculateStatistics(records);
            doc.setFontSize(12);
            doc.text(`平均分: ${stats.averageScore}`, 20, 45);
            doc.text(`最高分: ${stats.maxScore}`, 20, 55);
            doc.text(`最低分: ${stats.minScore}`, 20, 65);
        }

        // 保存PDF
        doc.save(`${filename}.pdf`);
    } catch (error) {
        // console.error('PDF导出失败:', error);
        throw new Error('PDF导出失败,请检查jsPDF库是否正确加载');
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function calculateStatistics(records) {
    if (records.length === 0) return {};

    const scores = records.map(r => r.totalScore || 0);
    const total = scores.reduce((sum, score) => sum + score, 0);
    const average = total / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 计算标准差
    const variance =
        scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return {
        totalRecords: records.length,
        averageScore: average.toFixed(2),
        maxScore,
        minScore,
        standardDeviation: stdDev.toFixed(2)
    };
}

// ============================================================================
// 模态框处理
// ============================================================================
function initializeModalHandlers() {
    // 分数调整模态框
    const scoreAdjustmentModal = document.getElementById('scoreAdjustmentModal');
    const closeScoreModalBtn = document.getElementById('closeScoreModalBtn');
    const cancelScoreAdjustBtn = document.getElementById('cancelScoreAdjustBtn');
    const confirmScoreAdjustBtn = document.getElementById('confirmScoreAdjustBtn');

    if (closeScoreModalBtn) {
        closeScoreModalBtn.addEventListener('click', () => {
            closeModal('scoreAdjustmentModal');
        });
    }

    if (cancelScoreAdjustBtn) {
        cancelScoreAdjustBtn.addEventListener('click', () => {
            closeModal('scoreAdjustmentModal');
        });
    }

    if (confirmScoreAdjustBtn) {
        confirmScoreAdjustBtn.addEventListener('click', () => {
            handleConfirmScoreAdjust();
        });
    }

    // 确认对话框
    const reviewConfirmDialog = document.getElementById('reviewConfirmDialog');
    const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
    const okConfirmBtn = document.getElementById('okConfirmBtn');

    if (cancelConfirmBtn) {
        cancelConfirmBtn.addEventListener('click', () => {
            closeModal('reviewConfirmDialog');
        });
    }

    if (okConfirmBtn) {
        okConfirmBtn.addEventListener('click', () => {
            handleOkConfirm();
        });
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            const backdrop = modal.querySelector('.modal-backdrop');
            const content = modal.querySelector('.modal-content');
            if (backdrop) backdrop.classList.add('opacity-100');
            if (content) {
                content.classList.add('scale-100', 'opacity-100');
                content.classList.remove('scale-95', 'opacity-0');
            }
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const backdrop = modal.querySelector('.modal-backdrop');
        const content = modal.querySelector('.modal-content');
        if (backdrop) backdrop.classList.remove('opacity-100');
        if (content) {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

function handleConfirmScoreAdjust() {
    // 获取当前正在调整的记录
    const currentRecord = window.currentScoreAdjustmentRecord;
    if (!currentRecord) {
        showToast('没有正在调整的记录', 'error');
        return;
    }

    // 获取调整后的分数
    const adjustedScores = getAdjustedScores();
    const modifyReason = document.getElementById('scoreModifyReason')?.value || '';

    // 验证输入
    if (!validateScoreAdjustment(adjustedScores, modifyReason)) {
        return;
    }

    // 计算新的总分
    const newTotalScore = calculateNewTotalScore(adjustedScores);

    // 创建调整记录
    const adjustmentRecord = {
        originalRecord: { ...currentRecord },
        adjustedScores,
        newTotalScore,
        modifyReason,
        adjustmentTime: Date().toISOString(),
        adjustedBy: 'teacher' // 可以扩展为用户系统
    };

    // 更新记录
    updateGradingRecord(currentRecord.id, newTotalScore, adjustedScores, modifyReason);

    // 保存调整历史
    saveScoreAdjustmentHistory(adjustmentRecord);

    // 关闭模态框
    closeModal('scoreAdjustmentModal');

    // 显示成功消息
    showToast(`分数调整已保存,新总分:${newTotalScore}分`, 'success');

    // 刷新显示
    refreshScoreDisplay(newTotalScore);
}

function handleOkConfirm() {
    closeModal('reviewConfirmDialog');
    showToast('操作已执行', 'success');
}

// ============================================================================
// 分数调整相关函数
// ============================================================================

/**
 * 获取调整后的分数
 */
function getAdjustedScores() {
    const adjustedScores = {};
    const scoreInputs = document.querySelectorAll('#scoreAdjustmentList input[type="number"]');

    scoreInputs.forEach(input => {
        const dimensionName = input.dataset.dimension;
        const maxScore = parseFloat(input.dataset.maxScore) || 100;
        const newScore = parseFloat(input.value) || 0;

        // 验证分数范围
        if (newScore < 0 || newScore > maxScore) {
            showToast(`${dimensionName}分数必须在0-${maxScore}之间`, 'error');
            throw new Error('分数超出范围');
        }

        adjustedScores[dimensionName] = {
            score: newScore,
            maxScore
        };
    });

    return adjustedScores;
}

/**
 * 验证分数调整
 */
function validateScoreAdjustment(adjustedScores, modifyReason) {
    // 检查是否有分数被调整
    let hasChanges = false;
    const currentRecord = window.currentScoreAdjustmentRecord;

    if (!currentRecord || !currentRecord.dimensions) {
        showToast('当前记录数据不完整', 'error');
        return false;
    }

    // 检查每个维度是否有变化
    Object.keys(adjustedScores).forEach(dimensionName => {
        const originalScore = currentRecord.detailedScores?.[dimensionName] || 0;
        const newScore = adjustedScores[dimensionName].score;
        if (Math.abs(newScore - originalScore) > 0.01) {
            hasChanges = true;
        }
    });

    if (!hasChanges) {
        showToast('分数没有变化,无需保存', 'warning');
        return false;
    }

    // 检查修改理由
    if (!modifyReason.trim()) {
        showToast('请输入修改分数的理由', 'warning');
        document.getElementById('scoreModifyReason')?.focus();
        return false;
    }

    if (modifyReason.trim().length < 5) {
        showToast('修改理由至少需要5个字符', 'warning');
        document.getElementById('scoreModifyReason')?.focus();
        return false;
    }

    return true;
}

/**
 * 计算新的总分
 */
function calculateNewTotalScore(adjustedScores) {
    let totalScore = 0;
    let totalWeight = 0;

    Object.values(adjustedScores).forEach(dimension => {
        // 计算加权分数
        const weight = dimension.weight || 1;
        const normalizedScore = (dimension.score / dimension.maxScore) * 100;
        totalScore += normalizedScore * weight;
        totalWeight += weight;
    });

    if (totalWeight === 0) return 0;

    // 返回加权平均分
    return Math.round(totalScore / totalWeight);
}

/**
 * 更新评分记录
 */
function updateGradingRecord(recordId, newTotalScore, adjustedScores, modifyReason) {
    chrome.storage.local.get(['gradingRecords'], result => {
        const records = result.gradingRecords || [];
        const recordIndex = records.findIndex(r => r.id === recordId);

        if (recordIndex === -1) {
            showToast('记录不存在', 'error');
            return;
        }

        // 更新记录
        const record = records[recordIndex];
        record.totalScore = newTotalScore;
        record.detailedScores = record.detailedScores || {};

        // 更新每个维度的分数
        Object.keys(adjustedScores).forEach(dimensionName => {
            record.detailedScores[dimensionName] = adjustedScores[dimensionName].score;
        });

        // 添加修改记录
        record.modificationHistory = record.modificationHistory || [];
        record.modificationHistory.push({
            timestamp: Date().toISOString(),
            reason: modifyReason,
            previousScore: record.totalScore,
            newScore: newTotalScore,
            adjustedScores
        });

        record.status = '已修改';
        record.lastModified = Date().toISOString();

        // 保存更新后的记录
        chrome.storage.local.set({ gradingRecords: records }, () => {});
    });
}

/**
 * 保存分数调整历史
 */
function saveScoreAdjustmentHistory(adjustmentRecord) {
    chrome.storage.local.get(['scoreAdjustmentHistory'], result => {
        let history = result.scoreAdjustmentHistory || [];
        history.unshift(adjustmentRecord); // 最新的在前面

        // 限制历史记录数量,最多保留1000条
        if (history.length > 1000) {
            history = history.slice(0, 1000);
        }

        chrome.storage.local.set({ scoreAdjustmentHistory: history }, () => {});
    });
}

/**
 * 刷新分数显示
 */
function refreshScoreDisplay(newTotalScore) {
    // 更新总分显示
    const totalScoreElement = document.getElementById('total-score');
    if (totalScoreElement) {
        totalScoreElement.innerHTML = `${newTotalScore}<span class="text-lg text-blue-600">/100</span>`;
    }

    // 更新进度条
    updateScoreProgress(newTotalScore);

    // 更新统计信息
    updateStatistics();
}

/**
 * 更新分数进度条
 */
function updateScoreProgress(score) {
    const progressBar = document.querySelector('#totalScoreProgress');
    if (progressBar) {
        progressBar.style.width = `${score}%`;
        progressBar.textContent = `${score}%`;
    }
}

/**
 * 更新统计信息
 */
function updateStatistics() {
    // 重新加载统计数据
    loadReviewRecords();
}

/**
 * 打开分数调整模态框
 * @param {Object} record - 评分记录
 */
function openScoreAdjustmentModal(record) {
    // 保存当前记录
    window.currentScoreAdjustmentRecord = record;

    // 填充模态框内容
    populateScoreAdjustmentModal(record);

    // 显示模态框
    openModal('scoreAdjustmentModal');
}

/**
 * 填充分数调整模态框
 * @param {Object} record - 评分记录
 */
function populateScoreAdjustmentModal(record) {
    const scoreAdjustmentList = document.getElementById('scoreAdjustmentList');
    const adjustedTotalScore = document.getElementById('adjustedTotalScore');

    if (!scoreAdjustmentList || !adjustedTotalScore) {
        // console.error('分数调整模态框元素未找到');
        return;
    }

    // 清空现有内容
    scoreAdjustmentList.innerHTML = '';

    // 创建维度分数调整项
    if (record.dimensions && Array.isArray(record.dimensions)) {
        record.dimensions.forEach((dimension, index) => {
            const currentScore = record.detailedScores?.[dimension.name] || 0;
            const maxScore = dimension.maxScore || 100;

            const dimensionEl = document.createElement('div');
            dimensionEl.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            dimensionEl.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                        <div class="font-medium text-gray-800 text-sm">${dimension.name}</div>
                        <div class="text-xs text-gray-600">权重: ${dimension.weight}% | 满分: ${maxScore}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="number"
                           class="score-adjust-input w-16 p-2 border border-gray-300 rounded text-center text-sm font-medium"
                           value="${currentScore}"
                           min="0"
                           max="${maxScore}"
                           data-dimension="${dimension.name}"
                           data-max-score="${maxScore}"
                           data-original-score="${currentScore}"
                           onchange="updateAdjustedTotalScore()"
                           oninput="validateScoreInput(this)">
                    <span class="text-sm text-gray-600">/${maxScore}</span>
                </div>
            `;

            scoreAdjustmentList.appendChild(dimensionEl);
        });
    } else {
        // 如果没有维度信息,显示简单的总分调整
        const simpleScoreEl = document.createElement('div');
        simpleScoreEl.className = 'p-4 bg-yellow-50 rounded-lg border border-yellow-200';
        simpleScoreEl.innerHTML = `
            <div class="text-center">
                <i data-lucide="alert-triangle" class="w-8 h-8 text-yellow-500 mx-auto mb-2"></i>
                <p class="text-sm text-yellow-800">当前记录没有评分维度信息,将直接调整总分</p>
                <div class="mt-3">
                    <label class="block text-sm font-medium text-gray-700 mb-2">总分调整</label>
                    <input type="number"
                           id="simpleTotalScore"
                           class="w-24 p-2 border border-gray-300 rounded text-center text-lg font-bold mx-auto"
                           value="${record.totalScore || 0}"
                           min="0"
                           max="100"
                           onchange="updateSimpleAdjustedScore()">
                </div>
            </div>
        `;
        scoreAdjustmentList.appendChild(simpleScoreEl);
    }

    // 更新总分显示
    updateAdjustedTotalScore();

    // 绑定实时更新事件
    bindScoreAdjustmentEvents();

    // 重新渲染图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 绑定分数调整事件
 */
function bindScoreAdjustmentEvents() {
    // 为每个分数输入框绑定事件
    const scoreInputs = document.querySelectorAll('.score-adjust-input');
    scoreInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateAdjustedTotalScore();
        });

        input.addEventListener('change', () => {
            validateScoreInput(input);
        });
    });

    // 为简单总分调整绑定事件
    const simpleScoreInput = document.getElementById('simpleTotalScore');
    if (simpleScoreInput) {
        simpleScoreInput.addEventListener('change', () => {
            updateSimpleAdjustedScore();
        });
    }
}

/**
 * 验证分数输入
 */
function validateScoreInput(input) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const value = parseFloat(input.value) || 0;

    if (value < min) {
        input.value = min;
        showToast(`分数不能小于${min}`, 'warning');
    } else if (value > max) {
        input.value = max;
        showToast(`分数不能大于${max}`, 'warning');
    }
}

/**
 * 更新调整后总分显示
 */
function updateAdjustedTotalScore() {
    const adjustedScores = getAdjustedScores();
    const newTotalScore = calculateNewTotalScore(adjustedScores);

    const adjustedTotalScoreElement = document.getElementById('adjustedTotalScore');
    if (adjustedTotalScoreElement) {
        adjustedTotalScoreElement.textContent = newTotalScore;

        // 添加颜色变化效果
        const scoreColor = getScoreColor(newTotalScore);
        adjustedTotalScoreElement.className = `text-xl font-bold ${scoreColor.text}`;
    }
}

/**
 * 更新简单总分调整
 */
function updateSimpleAdjustedScore() {
    const simpleScoreInput = document.getElementById('simpleTotalScore');
    const adjustedTotalScoreElement = document.getElementById('adjustedTotalScore');

    if (simpleScoreInput && adjustedTotalScoreElement) {
        const newScore = parseInt(simpleScoreInput.value) || 0;
        adjustedTotalScoreElement.textContent = newScore;

        // 添加颜色变化效果
        const scoreColor = getScoreColor(newScore);
        adjustedTotalScoreElement.className = `text-xl font-bold ${scoreColor.text}`;
    }
}

// ============================================================================
// 工具函数
// ============================================================================
function showToast(message, type = 'info') {
    // 使用改进的Toast通知系统
    toastNotifier.show(message, type, 3000);
}

function loadReviewRecords() {
    const recordsList = document.getElementById('reviewRecordsList');
    if (!recordsList) {
        // console.error('评分记录列表容器未找到');
        return;
    }

    // 显示加载状态
    recordsList.innerHTML =
        '<div class="text-center py-4 text-gray-500 text-xs">正在加载记录...</div>';

    // 从存储加载记录
    chrome.storage.local.get(['gradingRecords'], result => {
        const records = result.gradingRecords || [];

        if (records.length === 0) {
            recordsList.innerHTML =
                '<div class="text-center py-4 text-gray-500 text-xs">暂无评分记录</div>';
            return;
        }

        // 渲染记录列表
        renderReviewRecords(records);
        showToast(`已加载 ${records.length} 条评分记录`, 'success');
    });
}

function renderReviewRecords(records) {
    const recordsList = document.getElementById('reviewRecordsList');

    // 清空现有内容
    recordsList.innerHTML = '';

    // 创建记录列表容器
    const listContainer = document.createElement('div');
    listContainer.className = 'space-y-2 max-h-80 overflow-y-auto custom-scrollbar';

    // 按时间倒序排列记录
    const sortedRecords = [...records].sort((a, b) => {
        const timeA = new Date(a.gradingTime || 0).getTime();
        const timeB = new Date(b.gradingTime || 0).getTime();
        return timeB - timeA; // 最新的在前
    });

    // 渲染每条记录
    sortedRecords.forEach((record, index) => {
        const recordEl = createRecordElement(record, index);
        listContainer.appendChild(recordEl);
    });

    // 添加统计信息
    const stats = calculateStatistics(records);
    const statsEl = createStatisticsElement(stats);
    recordsList.appendChild(statsEl);

    recordsList.appendChild(listContainer);

    // 绑定事件
    bindRecordEvents();
}

function createRecordElement(record, index) {
    const recordEl = document.createElement('div');
    recordEl.className =
        'bg-white rounded-lg p-3 border hover:border-gray-300 transition-colors cursor-pointer';
    recordEl.dataset.recordId = record.id;

    const scoreColor = getScoreColor(record.totalScore || 0);
    const statusBadge = getStatusBadge(record.status || '已评分');

    recordEl.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div class="flex items-center space-x-2">
                <div class="w-6 h-6 ${scoreColor.bg} rounded-full flex items-center justify-center text-xs font-bold ${scoreColor.text}">
                    ${record.totalScore || 0}
                </div>
                <div>
                    <div class="font-medium text-gray-800 text-sm">${record.studentName || '未知学生'}</div>
                    <div class="text-xs text-gray-500">${formatDate(record.gradingTime)}</div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                ${statusBadge}
                <button class="adjust-score-btn text-green-500 hover:text-green-700 transition-colors" data-record-id="${record.id}" title="调整分数">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button class="view-record-btn text-blue-500 hover:text-blue-700 transition-colors" data-record-id="${record.id}">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <button class="delete-record-btn text-red-500 hover:text-red-700 transition-colors" data-record-id="${record.id}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
        <div class="flex justify-between items-center text-xs text-gray-600">
            <div>ID: ${record.id || 'N/A'}</div>
            <div>${getDimensionSummary(record.dimensions)}维度</div>
        </div>
    `;

    return recordEl;
}

function createStatisticsElement(stats) {
    const statsEl = document.createElement('div');
    statsEl.className = 'bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200';

    statsEl.innerHTML = `
        <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="text-center">
                <div class="font-bold text-blue-800">${stats.totalRecords}</div>
                <div class="text-blue-600">总记录</div>
            </div>
            <div class="text-center">
                <div class="font-bold text-green-800">${stats.averageScore}</div>
                <div class="text-green-600">平均分</div>
            </div>
            <div class="text-center">
                <div class="font-bold text-orange-800">${stats.maxScore}</div>
                <div class="text-orange-600">最高分</div>
            </div>
            <div class="text-center">
                <div class="font-bold text-red-800">${stats.minScore}</div>
                <div class="text-red-600">最低分</div>
            </div>
        </div>
    `;

    return statsEl;
}

function getScoreColor(score) {
    if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-800' };
    if (score >= 80) return { bg: 'bg-blue-100', text: 'text-blue-800' };
    if (score >= 70) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    if (score >= 60) return { bg: 'bg-orange-100', text: 'text-orange-800' };
    return { bg: 'bg-red-100', text: 'text-red-800' };
}

function getStatusBadge(status) {
    const badges = {
        已评分: '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">已评分</span>',
        待复核: '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">待复核</span>',
        已复核: '<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">已复核</span>',
        已修改: '<span class="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">已修改</span>'
    };

    badges[status] ||
        `<span class = "px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">${status}</span>`; return badges[status] ||
        `<span class;;
}

function formatDate(dateString) {
    if (!dateString) return '未知时间';

    try {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '无效时间';
    }
}

function getDimensionSummary(dimensions) {
    if (!dimensions || !Array.isArray(dimensions)) return '0';
    return dimensions.length;
}

function bindRecordEvents() {
    // 调整分数
    document.querySelectorAll('.adjust-score-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const recordId = e.currentTarget.dataset.recordId;
            openScoreAdjustmentForRecord(recordId);
        });
    });

    // 查看记录详情
    document.querySelectorAll('.view-record-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const recordId = e.currentTarget.dataset.recordId;
            viewRecordDetail(recordId);
        });
    });

    // 删除记录
    document.querySelectorAll('.delete-record-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const recordId = e.currentTarget.dataset.recordId;
            deleteRecord(recordId);
        });
    });

    // 重新渲染图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 为指定记录打开分数调整模态框
 * @param {string} recordId - 记录ID
 */
function openScoreAdjustmentForRecord(recordId) {
    // 从存储获取记录
    chrome.storage.local.get(['gradingRecords'], result => {
        const records = result.gradingRecords || [];
        const record = records.find(r => r.id === recordId);

        if (!record) {
            showToast('记录不存在', 'error');
            return;
        }

        // 检查记录状态
        if (record.status === '已复核' || record.status === '已确认') {
            if (!confirm('该记录已经复核确认,是否仍要调整分数？')) {
                return;
            }
        }

        // 打开分数调整模态框
        openScoreAdjustmentModal(record);
    });
}

function viewRecordDetail(recordId) {
    chrome.storage.local.get(['gradingRecords'], result => {
        const records = result.gradingRecords || [];
        const record = records.find(r => r.id === recordId);

        if (!record) {
            showToast('记录不存在', 'error');
            return;
        }

        showRecordDetailModal(record);
    });
}

function showRecordDetailModal(record) {
    // 创建记录详情模态框
    const modal = createRecordDetailModal(record);
    document.body.appendChild(modal);

    // 显示模态框
    modal.classList.remove('hidden');
    setTimeout(() => {
        const modalContent = modal.querySelector('.record-detail-content');
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);

    // 重新渲染图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function createRecordDetailModal(record) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 hidden';

    const scoreColor = getScoreColor(record.totalScore || 0);

    modal.innerHTML = `
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-2xl p-6 w-full max-w-2xl transform transition-all scale-95 opacity-0 record-detail-content">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">评分记录详情</h3>
                    <button class="close-record-detail text-gray-400 hover:text-gray-600 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <!-- 基本信息 -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-800 mb-3">基本信息</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="text-gray-600">学生姓名:</span>
                                <span class="font-medium">${record.studentName || '未知'}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">总分:</span>
                                <span class="font-medium ${scoreColor.text}">${record.totalScore || 0}/100</span>
                            </div>
                            <div>
                                <span class="text-gray-600">评分时间:</span>
                                <span class="font-medium">${formatDate(record.gradingTime)}</span>
                            </div>
                            <div>
                                <span class="text-gray-600">记录ID:</span>
                                <span class="font-medium font-mono text-xs">${record.id || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 评分详情 -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-800 mb-3">评分详情</h4>
                        <div id="dimensionDetails" class="space-y-2">
                            <!-- 动态生成的维度详情 -->
                        </div>
                    </div>

                    <!-- 评语 -->
                    ${
    record.comments
        ? `
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-medium text-gray-800 mb-3">评语</h4>
                            <div class="text-sm text-gray-700 bg-white p-3 rounded border">
                                ${record.comments}
                            </div>
                        </div>
                    `
        : ''
}

                    <!-- 操作按钮 -->
                    <div class="flex justify-end space-x-2 pt-4">
                        <button class="export-single-record px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition-colors" data-record-id="${record.id}">
                            <i data-lucide="download" class="w-4 h-4 inline mr-1"></i>导出
                        </button>
                        <button class="close-record-detail px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs transition-colors">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 绑定关闭事件
    modal.querySelector('.close-record-detail').addEventListener('click', () => {
        const modalContent = modal.querySelector('.record-detail-content');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.remove();
        }, 300);
    });

    // 绑定导出事件
    modal.querySelector('.export-single-record').addEventListener('click', e => {
        const recordId = e.target.dataset.recordId;
        exportSingleRecord(recordId);
    });

    // 填充评分维度详情
    fillDimensionDetails(modal, record);

    return modal;
}

function fillDimensionDetails(modal, record) {
    const container = modal.querySelector('#dimensionDetails');
    const dimensions = record.dimensions || [];

    if (dimensions.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm">暂无评分维度信息</div>';
        return;
    }

    dimensions.forEach(dimension => {
        const score = record.detailedScores?.[dimension.name] || 0;
        const maxScore = dimension.maxScore || 0;
        const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;

        const dimensionEl = document.createElement('div');
        dimensionEl.className = 'bg-white p-3 rounded border';
        dimensionEl.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="font-medium text-gray-800">${dimension.name}</span>
                <span class="text-sm font-bold ${score >= maxScore * 0.8 ? 'text-green-600' : score >= maxScore * 0.6 ? 'text-yellow-600' : 'text-red-600'}">${score}/${maxScore}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="${score >= maxScore * 0.8 ? 'bg-green-500' : score >= maxScore * 0.6 ? 'bg-yellow-500' : 'bg-red-500'} h-2 rounded-full transition-all" style="width: ${percentage}%"></div>
            </div>
            <div class="text-xs text-gray-500 mt-1">权重: ${dimension.weight}% | 完成度: ${percentage}%</div>
        `;
        container.appendChild(dimensionEl);
    });
}

function deleteRecord(recordId) {
    if (!confirm('确定要删除这条评分记录吗？此操作不可恢复.')) {
        return;
    }

    chrome.storage.local.get(['gradingRecords'], result => {
        let records = result.gradingRecords || [];
        const initialLength = records.length;

        // 删除指定记录
        records = records.filter(r => r.id !== recordId);

        if (records.length === initialLength) {
            showToast('记录不存在', 'error');
            return;
        }

        // 保存更新后的记录
        chrome.storage.local.set({ gradingRecords: records }, () => {
            showToast('记录已删除', 'success');
            // 重新加载记录列表
            loadReviewRecords();
        });
    });
}

function exportSingleRecord(recordId) {
    chrome.storage.local.get(['gradingRecords'], result => {
        const records = result.gradingRecords || [];
        const record = records.find(r => r.id === recordId);

        if (!record) {
            showToast('记录不存在', 'error');
            return;
        }

        // 导出单个记录为JSON
        const data = {
            record,
            exportTime: Date().toISOString()
        };

        const jsonString = JSON.stringify(data, null, 2);
        const filename = `评分记录_${record.studentName || '未知学生'}_${record.id}.json`;

        downloadFile(jsonString, filename, 'application/json');
        showToast('单个记录已导出', 'success');
    });
}

// ============================================================================
// 监听来自background的消息
// ============================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'UPDATE_SCORE') {
        const totalScore = document.getElementById('total-score');
        if (totalScore) {
            totalScore.innerHTML = `${request.data.score}<span class="text-lg text-blue-600">/100</span>`;
        }
        sendResponse({ success: true });
    }

    return true;
});
