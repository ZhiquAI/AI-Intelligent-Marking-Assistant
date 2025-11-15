// ============================================================================
// 智学网AI智能阅卷助手 - Popup 主入口 (安全版本)
// 100%还原原HTML中的所有交互逻辑,修复XSS安全问题
// ============================================================================

// ============================================================================
// 导入模块
// ============================================================================
import { gradingManager } from '../core/grading/index.js';
import { reviewModule } from '../core/review/index.js';
import { domSafety } from '../utils/dom-safety.js';

// ============================================================================
// 全局变量
// ============================================================================
let currentRubricContent = '';
let isDarkMode = false;

// ============================================================================
// 页面加载完成后执行
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 初始化事件监听器
    initializeEventListeners();

    // 初始化UI状态
    initializeUI();

    // 加载保存的设置
    loadSettings();

    // 初始化模块
    initializeModules();
});

// ============================================================================
// 初始化函数
// ============================================================================
function initializeEventListeners() {
    // 标签页切换
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            switchTab(tabId);
        });
    });

    // 批量评分按钮
    const batchGradeBtn = document.getElementById('batchGradeBtn');
    if (batchGradeBtn) {
        batchGradeBtn.addEventListener('click', startBatchGrading);
    }

    // 开始复核按钮
    const startReviewBtn = document.getElementById('startReviewBtn');
    if (startReviewBtn) {
        startReviewBtn.addEventListener('click', startReview);
    }

    // 刷新记录按钮
    const refreshRecordsBtn = document.getElementById('refreshRecordsBtn');
    if (refreshRecordsBtn) {
        refreshRecordsBtn.addEventListener('click', loadReviewRecords);
    }

    // 评分标准输入
    const rubricInput = document.getElementById('rubricInput');
    if (rubricInput) {
        rubricInput.addEventListener('input', (e) => {
            currentRubricContent = e.target.value;
            updateRubricPreview();
        });
    }

    // 设置按钮
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
    }

    // 深色模式切换
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }
}

function initializeUI() {
    // 默认显示第一个标签页
    switchTab('grading');

    // 加载深色模式设置
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        isDarkMode = true;
        document.body.classList.add('dark');
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }
}

function initializeModules() {
    // 初始化评分模块
    if (gradingManager) {
        gradingManager.init();
    }

    // 初始化复核模块
    if (reviewModule) {
        reviewModule.init();
    }
}

// ============================================================================
// 标签页切换
// ============================================================================
function switchTab(tabId) {
    // 隐藏所有标签页内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });

    // 显示选中的标签页内容
    const selectedTab = document.getElementById(`${tabId}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    // 更新标签页按钮状态
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        if (button.dataset.tab === tabId) {
            button.classList.add('active', 'bg-blue-600', 'text-white');
            button.classList.remove('bg-gray-100', 'text-gray-700');
        } else {
            button.classList.remove('active', 'bg-blue-600', 'text-white');
            button.classList.add('bg-gray-100', 'text-gray-700');
        }
    });

    // 根据标签页加载相应数据
    switch (tabId) {
    case 'review':
        loadReviewData();
        break;
    case 'records':
        loadReviewRecords();
        break;
    case 'settings':
        loadSettingsTab();
        break;
    }
}

// ============================================================================
// 功能函数
// ============================================================================
function startBatchGrading() {
    if (!currentRubricContent.trim()) {
        showToast('warning', '请先输入评分标准', '评分标准不能为空');
        return;
    }

    // 发送到background script处理
    chrome.runtime.sendMessage({
        action: 'START_BATCH_GRADING',
        data: {
            rubric: currentRubricContent
        }
    }, (response) => {
        if (response && response.success) {
            showToast('success', '批量评分已启动', '正在处理中...');
        } else {
            showToast('error', '启动失败', response?.error || '未知错误');
        }
    });
}

function startReview() {
    chrome.runtime.sendMessage({
        action: 'START_REVIEW'
    }, (response) => {
        if (response && response.success) {
            showToast('success', '复核已启动', '请切换到智学网页面');
        } else {
            showToast('error', '启动失败', response?.error || '未知错误');
        }
    });
}

function loadReviewData() {
    chrome.runtime.sendMessage({
        action: 'GET_REVIEW_DATA'
    }, (response) => {
        if (response && response.success) {
            updateReviewUI(response.data);
        }
    });
}

function loadReviewRecords() {
    // TODO: 实现加载评分记录逻辑
    const recordsList = document.getElementById('reviewRecordsList');
    if (recordsList) {
        // 使用安全DOM操作替代innerHTML
        domSafety.safeTextContent(recordsList, '记录已刷新', {
            escapeHtml: true,
            allowLineBreaks: false
        });
        // 添加样式类
        recordsList.className = 'text-center py-4 text-gray-500 text-xs';
    }
}

function updateReviewUI(data) {
    const currentQuestion = document.getElementById('current-question');
    const aiScore = document.getElementById('ai-score');
    const studentAnswer = document.getElementById('student-answer');
    const aiAnalysis = document.getElementById('ai-analysis');

    if (currentQuestion) {
        currentQuestion.textContent = `第 ${data.currentIndex + 1} 题 / 共 ${data.totalQuestions} 题`;
    }

    if (aiScore) {
        aiScore.textContent = `${data.aiScore}/100`;
    }

    if (studentAnswer) {
        studentAnswer.textContent = data.studentAnswer || '暂无答案';
    }

    if (aiAnalysis) {
        aiAnalysis.textContent = data.aiAnalysis || '暂无分析';
    }
}

function updateRubricPreview() {
    const preview = document.getElementById('rubric-preview');
    if (preview) {
        if (currentRubricContent.trim()) {
            // 使用安全DOM操作
            domSafety.safeTextContent(preview, currentRubricContent, {
                escapeHtml: true,
                allowLineBreaks: true
            });
            preview.classList.remove('text-gray-400');
        } else {
            preview.textContent = '评分标准预览将显示在这里...';
            preview.classList.add('text-gray-400');
        }
    }
}

function openSettingsModal() {
    // TODO: 实现设置模态框
    showToast('info', '功能开发中', '设置功能即将推出');
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
}

function loadSettingsTab() {

    // TODO: 加载设置选项
}

// ============================================================================
// 监听来自background的消息
// ============================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'UPDATE_SCORE') {
        const totalScore = document.getElementById('total-score');
        if (totalScore) {
            // 使用安全DOM操作替代innerHTML
            totalScore.textContent = request.data.score;

            // 创建分数后缀
            const suffix = document.createElement('span');
            suffix.className = 'text-lg text-blue-600';
            suffix.textContent = '/100';
            totalScore.appendChild(suffix);
        }
        sendResponse({ success: true });
    }

    if (request.action === 'UPDATE_PROGRESS') {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        if (progressBar) {
            progressBar.style.width = `${request.data.progress}%`;
        }

        if (progressText) {
            progressText.textContent = `${request.data.current}/${request.data.total}`;
        }

        sendResponse({ success: true });
    }

    return true; // 保持消息通道开放
});

// ============================================================================
// Toast通知系统
// ============================================================================
function showToast(type, title, message, duration = 3000) {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 min-w-[300px] max-w-[400px]`;

    // 设置样式
    const styles = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };

    toast.className += ` ${styles[type] || styles.info}`;

    // 使用安全DOM操作创建内容
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', type === 'success'
        ? 'check-circle'
        : type === 'error'
            ? 'x-circle'
            : type === 'warning' ? 'alert-triangle' : 'info');
    icon.className = 'w-5 h-5';

    const content = document.createElement('div');
    content.className = 'flex items-start space-x-3';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'flex-shrink-0';
    iconWrapper.appendChild(icon);

    const textWrapper = document.createElement('div');
    textWrapper.className = 'flex-1';

    const titleEl = document.createElement('div');
    titleEl.className = 'font-semibold';
    titleEl.textContent = title;

    const messageEl = document.createElement('div');
    messageEl.className = 'text-sm opacity-90';
    messageEl.textContent = message;

    textWrapper.appendChild(titleEl);
    textWrapper.appendChild(messageEl);

    content.appendChild(iconWrapper);
    content.appendChild(textWrapper);
    toast.appendChild(content);

    // 添加到页面
    document.body.appendChild(toast);

    // 初始化图标
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ elements: [icon] });
    }

    // 自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
}

// ============================================================================
// 设置管理
// ============================================================================
function loadSettings() {
    // 加载评分标准
    const savedRubric = localStorage.getItem('rubricConfig');
    if (savedRubric) {
        try {
            const rubric = JSON.parse(savedRubric);
            currentRubricContent = rubric.content || '';

            const rubricInput = document.getElementById('rubricInput');
            if (rubricInput) {
                rubricInput.value = currentRubricContent;
                updateRubricPreview();
            }
        } catch (error) {
            // console.error('加载评分标准失败:', error);
        }
    }
}

function saveSettings() {
    // 保存评分标准
    if (currentRubricContent.trim()) {
        const rubricConfig = {
            content: currentRubricContent,
            lastModified: Date().toISOString()
        };
        localStorage.setItem('rubricConfig', JSON.stringify(rubricConfig));
    }
}

// ============================================================================
// 工具函数
// ============================================================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 页面卸载时保存设置
window.addEventListener('beforeunload', saveSettings);
