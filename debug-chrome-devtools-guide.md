# Chrome DevTools 调试指南 - AI智能阅卷助手扩展

## 问题诊断步骤

### 1. 检查扩展popup中是否有设置按钮

**步骤：**
1. 右键点击扩展图标 → 选择"检查弹出内容"
2. 在Elements面板中查找设置按钮：
   ```html
   <button id="system-settings-button" class="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
       <div class="relative">
           <i data-lucide="settings" class="w-4 h-4 text-gray-600"></i>
           <div class="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
       </div>
   </button>
   ```

**控制台命令：**
```javascript
// 检查设置按钮是否存在
const settingsBtn = document.getElementById('system-settings-button');
console.log('设置按钮存在:', !!settingsBtn);
console.log('设置按钮:', settingsBtn);

// 检查父容器是否存在
const header = document.querySelector('.popup-header .flex.items-center.justify-between');
console.log('头部容器存在:', !!header);
```

### 2. 验证HTML结构是否正确加载

**检查步骤：**
1. 在Elements面板中验证以下关键元素：
   - `#settingsModal` - 设置模态框容器
   - `#settingsModalContent` - 设置模态框内容
   - `.settings-tab-btn` - 设置标签页按钮
   - `.settings-tab-content` - 设置标签页内容

**控制台命令：**
```javascript
// 检查设置模态框
const modal = document.getElementById('settingsModal');
console.log('设置模态框存在:', !!modal);
console.log('模态框是否隐藏:', modal ? modal.classList.contains('hidden') : 'N/A');

// 检查标签页按钮
const tabButtons = document.querySelectorAll('.settings-tab-btn');
console.log('设置标签页按钮数量:', tabButtons.length);
tabButtons.forEach(btn => console.log('标签:', btn.dataset.settingsTab));

// 检查标签页内容
const tabContents = document.querySelectorAll('.settings-tab-content');
console.log('设置标签页内容数量:', tabContents.length);
```

### 3. 检查JavaScript是否有错误

**步骤：**
1. 打开Console面板查看错误信息
2. 特别注意以下错误：
   - 模块导入错误
   - 元素未找到错误
   - 事件绑定错误

**控制台命令：**
```javascript
// 检查关键对象是否存在
console.log('gradingManager:', typeof window.gradingManager);
console.log('lucide:', typeof lucide);
console.log('Chrome API:', typeof chrome);

// 检查事件监听器
const settingsBtn = document.getElementById('system-settings-button');
if (settingsBtn) {
    console.log('设置按钮事件监听器数量:', getEventListeners ? getEventListeners(settingsBtn) : '需要getEventListeners支持');
}
```

### 4. 确认设置模态框是否存在

**控制台测试命令：**
```javascript
// 手动打开设置模态框
function testOpenSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const modalContent = document.getElementById('settingsModalContent');

    if (modal && modalContent) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        console.log('设置模态框已打开');
    } else {
        console.error('设置模态框元素未找到');
    }
}

// 执行测试
testOpenSettingsModal();
```

### 5. 验证CSS样式是否正确应用

**检查步骤：**
1. 在Elements面板中选择设置按钮
2. 在Styles面板中检查：
   - `display` 属性
   - `visibility` 属性
   - `opacity` 属性
   - Tailwind CSS类是否正确加载

**控制台命令：**
```javascript
// 检查设置按钮的计算样式
const settingsBtn = document.getElementById('system-settings-button');
if (settingsBtn) {
    const styles = window.getComputedStyle(settingsBtn);
    console.log('显示属性:', styles.display);
    console.log('可见性:', styles.visibility);
    console.log('透明度:', styles.opacity);
    console.log('z-index:', styles.zIndex);
}
```

## 常见问题及解决方案

### 问题1: 设置按钮不显示
**可能原因：**
- JavaScript未正确执行
- DOM元素未正确创建
- CSS样式冲突

**解决方案：**
```javascript
// 强制重新创建设置按钮
function recreateSettingsButton() {
    const header = document.querySelector('.popup-header .flex.items-center.justify-between');
    if (header && !document.getElementById('system-settings-button')) {
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
        settingsButton.addEventListener('click', () => {
            if (typeof openSettingsModal === 'function') {
                openSettingsModal();
            } else {
                console.error('openSettingsModal 函数未定义');
            }
        });
        header.insertBefore(settingsButton, header.firstChild);

        // 重新初始化Lucide图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

recreateSettingsButton();
```

### 问题2: 模态框无法打开
**可能原因：**
- 模态框元素不存在
- 事件处理函数未定义
- CSS类冲突

**解决方案：**
```javascript
// 检查并修复模态框功能
function fixSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const modalContent = document.getElementById('settingsModalContent');

    if (!modal || !modalContent) {
        console.error('设置模态框元素缺失');
        return;
    }

    // 确保模态框有正确的初始类
    modal.classList.add('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'backdrop-blur-sm', 'z-50', 'hidden');
    modalContent.classList.add('bg-white', 'rounded-2xl', 'p-6', 'w-full', 'max-w-4xl', 'max-h-[80vh]', 'transform', 'transition-all', 'scale-95', 'opacity-0');

    console.log('设置模态框已修复');
}

fixSettingsModal();
```

### 问题3: 设置内容显示不正确
**可能原因：**
- 旧版本HTML缓存
- JavaScript初始化顺序问题
- 数据加载失败

**解决方案：**
```javascript
// 重新初始化设置系统
function reinitializeSettings() {
    // 清除初始化标志
    window.settingsInitialized = false;

    // 重新加载设置数据
    chrome.storage.local.get(['settings'], result => {
        const settings = result.settings || {};
        console.log('重新加载的设置:', settings);

        // 重新应用设置到UI
        if (typeof applySettingsToUI === 'function') {
            applySettingsToUI(settings);
        }

        // 切换到API密钥标签页
        if (typeof switchToTab === 'function') {
            switchToTab('api');
        }
    });
}

reinitializeSettings();
```

## 调试技巧

### 1. 使用断点调试
在Sources面板中：
1. 找到 `popup.js` 文件
2. 在 `openSettingsModal` 函数设置断点
3. 点击设置按钮触发断点
4. 逐步执行查看变量状态

### 2. 监控DOM变化
在Console中执行：
```javascript
// 监控设置按钮的添加
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.id === 'system-settings-button') {
                console.log('设置按钮已添加到DOM:', node);
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
```

### 3. 网络请求检查
在Network面板中：
1. 查看是否有JavaScript文件加载失败
2. 检查Chrome API调用是否成功
3. 监控存储操作

### 4. 性能分析
在Performance面板中：
1. 记录页面加载过程
2. 查看JavaScript执行时间
3. 分析是否存在阻塞操作

## 完整诊断脚本

```javascript
// 一次性完整诊断脚本
function diagnoseExtension() {
    console.log('=== AI智能阅卷助手扩展诊断 ===');

    // 1. 检查关键元素
    const elements = {
        'settings-button': document.getElementById('system-settings-button'),
        'settings-modal': document.getElementById('settingsModal'),
        'settings-content': document.getElementById('settingsModalContent'),
        'header': document.querySelector('.popup-header .flex.items-center.justify-between'),
        'tab-buttons': document.querySelectorAll('.settings-tab-btn'),
        'tab-contents': document.querySelectorAll('.settings-tab-content')
    };

    Object.entries(elements).forEach(([name, element]) => {
        if (Array.isArray(element)) {
            console.log(`${name}: ${element.length} 个元素`);
        } else {
            console.log(`${name}: ${element ? '存在' : '缺失'}`);
        }
    });

    // 2. 检查关键函数
    const functions = {
        'openSettingsModal': typeof openSettingsModal,
        'initializeSettings': typeof initializeSettings,
        'switchToTab': typeof switchToTab,
        'lucide': typeof lucide,
        'chrome': typeof chrome
    };

    Object.entries(functions).forEach(([name, type]) => {
        console.log(`${name}: ${type}`);
    });

    // 3. 检查存储数据
    chrome.storage.local.get(['settings'], result => {
        console.log('存储的设置:', result.settings);
    });

    // 4. 检查错误状态
    const errorElements = document.querySelectorAll('[data-error]');
    if (errorElements.length > 0) {
        console.warn('发现错误元素:', errorElements);
    }

    console.log('=== 诊断完成 ===');
}

// 执行诊断
diagnoseExtension();
```

使用此指南可以系统性地诊断和解决Chrome扩展的UI问题。如果所有步骤都正常但问题仍然存在，可能需要检查扩展的重新加载或浏览器缓存问题。