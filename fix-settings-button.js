/**
 * 设置按钮创建修复脚本
 * 在Chrome DevTools Console中运行此脚本来诊断和修复问题
 */

// 诊断函数
function diagnoseSettingsButton() {
    console.log('=== AI智能阅卷助手设置按钮诊断 ===');

    // 1. 检查头部容器
    const header = document.querySelector('.popup-header .flex.items-center.justify-between');
    console.log('头部容器:', header ? '存在' : '缺失');
    if (header) {
        console.log('头部容器类名:', header.className);
        console.log('头部子元素数量:', header.children.length);
    }

    // 2. 检查设置按钮
    const settingsBtn = document.getElementById('system-settings-button');
    console.log('设置按钮:', settingsBtn ? '存在' : '缺失');

    // 3. 检查设置模态框
    const modal = document.getElementById('settingsModal');
    console.log('设置模态框:', modal ? '存在' : '缺失');

    // 4. 检查标签页
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    console.log('设置标签页数量:', tabButtons.length);

    console.log('=== 诊断完成 ===');
}

// 修复函数
function fixSettingsButton() {
    console.log('开始修复设置按钮...');

    // 查找头部容器（使用更灵活的选择器）
    let header = document.querySelector('.popup-header .flex.items-center.justify-between');

    if (!header) {
        // 尝试其他可能的选择器
        header = document.querySelector('.popup-header');
        if (!header) {
            console.error('无法找到头部容器');
            return false;
        }

        // 在头部内查找容器
        const flexContainer = header.querySelector('.flex');
        if (flexContainer) {
            header = flexContainer;
        } else {
            // 创建容器
            const container = document.createElement('div');
            container.className = 'flex items-center justify-between';
            container.innerHTML = header.innerHTML;
            header.innerHTML = '';
            header.appendChild(container);
            header = container;
        }
    }

    // 移除已存在的设置按钮
    const existingBtn = document.getElementById('system-settings-button');
    if (existingBtn) {
        existingBtn.remove();
    }

    // 创建新的设置按钮
    const settingsButton = document.createElement('button');
    settingsButton.id = 'system-settings-button';
    settingsButton.className = 'p-2 hover:bg-gray-100 rounded-lg transition-colors relative';
    settingsButton.title = '系统设置';
    settingsButton.innerHTML = `
        <div class="relative">
            <i data-lucide="settings" class="w-4 h-4 text-gray-600"></i>
            <div class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
    `;

    // 绑定点击事件
    settingsButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('设置按钮被点击');
        openSettingsModal();
    });

    // 添加到头部最前面
    header.insertBefore(settingsButton, header.firstChild);

    // 确保图标被渲染
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('Lucide图标已重新渲染');
        } else {
            console.warn('Lucide图标库未加载');
        }
    }, 100);

    console.log('设置按钮修复完成');
    return true;
}

// 测试模态框函数
function testSettingsModal() {
    console.log('测试设置模态框...');

    const modal = document.getElementById('settingsModal');
    const modalContent = document.getElementById('settingsModalContent');

    if (!modal) {
        console.error('设置模态框不存在');
        return false;
    }

    if (!modalContent) {
        console.error('设置模态框内容不存在');
        return false;
    }

    // 显示模态框
    modal.classList.remove('hidden');

    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);

    console.log('设置模态框已打开');
    return true;
}

// 强制初始化设置系统
function forceInitializeSettings() {
    console.log('强制初始化设置系统...');

    // 确保初始化标志被重置
    window.settingsInitialized = false;

    // 手动调用初始化函数
    if (typeof initializeSettings === 'function') {
        initializeSettings();
        console.log('设置系统初始化完成');
    } else {
        console.error('initializeSettings函数不存在');
        return false;
    }

    return true;
}

// 完整修复流程
function completeFix() {
    console.log('=== 开始完整修复流程 ===');

    // 1. 诊断问题
    diagnoseSettingsButton();

    // 2. 修复设置按钮
    const buttonFixed = fixSettingsButton();

    // 3. 强制初始化设置系统
    const settingsInitialized = forceInitializeSettings();

    // 4. 测试模态框
    setTimeout(() => {
        testSettingsModal();
    }, 500);

    console.log('=== 修复完成 ===');
    console.log('按钮修复:', buttonFixed ? '成功' : '失败');
    console.log('设置系统初始化:', settingsInitialized ? '成功' : '失败');

    return buttonFixed && settingsInitialized;
}

// 导出函数到全局作用域
window.diagnoseSettingsButton = diagnoseSettingsButton;
window.fixSettingsButton = fixSettingsButton;
window.testSettingsModal = testSettingsModal;
window.forceInitializeSettings = forceInitializeSettings;
window.completeFix = completeFix;

// 自动执行诊断
console.log('设置按钮修复脚本已加载，请执行 completeFix() 进行完整修复');

// 可选：自动执行完整修复
// setTimeout(completeFix, 1000);