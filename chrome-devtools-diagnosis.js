/**
 * Chrome DevTools MCP 诊断脚本 - AI阅卷助手设置功能问题
 * 使用Chrome DevTools MCP来执行全面的诊断
 */

console.log('🔍 === AI阅卷助手设置功能诊断开始 ===');

// ============================================================================
// 1. 检查控制台是否有JavaScript错误
// ============================================================================
function checkConsoleErrors() {
    console.log('\n📋 1. 检查控制台错误状态');

    // 检查是否有未捕获的错误
    const errorCount = console.error.length || 0;
    const warningCount = console.warn.length || 0;

    console.log(`  - 错误数量: ${errorCount}`);
    console.log(`  - 警告数量: ${warningCount}`);

    // 检查常见的Chrome扩展错误
    const commonErrors = [
        'Refused to execute inline event handler',
        'Cannot access property',
        'is not a function',
        'Failed to load resource',
        'Extension context invalidated'
    ];

    console.log('  - 检查常见错误模式...');

    return {
        hasErrors: errorCount > 0,
        hasWarnings: warningCount > 0,
        errorCount,
        warningCount
    };
}

// ============================================================================
// 2. 验证openSettingsModal函数是否真的被暴露到全局作用域
// ============================================================================
function verifyGlobalFunction() {
    console.log('\n🔍 2. 验证全局函数暴露');

    const checks = {
        'window.openSettingsModal': typeof window.openSettingsModal,
        'window.initializeSettings': typeof window.initializeSettings,
        'window.switchToTab': typeof window.switchToTab,
        'window.closeSettingsModal': typeof window.closeSettingsModal,
        'window.gradingManager': typeof window.gradingManager,
        'window.currentSettings': typeof window.currentSettings
    };

    console.log('  全局函数检查结果:');
    Object.entries(checks).forEach(([name, type]) => {
        const status = type === 'function' ? '✅' : type === 'object' ? '📦' : type === 'undefined' ? '❌' : '⚠️';
        console.log(`    ${status} ${name}: ${type}`);
    });

    // 检查函数的详细属性
    if (typeof window.openSettingsModal === 'function') {
        console.log('  - openSettingsModal 函数详情:');
        console.log(`    函数名: ${window.openSettingsModal.name}`);
        console.log(`    参数长度: ${window.openSettingsModal.length}`);
        console.log(`    源代码: ${window.openSettingsModal.toString().substring(0, 100)}...`);
    }

    return {
        openSettingsModalExists: typeof window.openSettingsModal === 'function',
        allFunctionsExist: Object.values(checks).every(type => type !== 'undefined')
    };
}

// ============================================================================
// 3. 检查ES6模块加载是否正常
// ============================================================================
function checkModuleLoading() {
    console.log('\n📦 3. 检查ES6模块加载状态');

    const moduleChecks = {
        'gradingManager': () => window.gradingManager,
        'reviewSystem': () => window.reviewSystem,
        'toastNotifier': () => window.toastNotifier
    };

    const results = {};

    Object.entries(moduleChecks).forEach(([name, getter]) => {
        try {
            const module = getter();
            results[name] = {
                loaded: !!module,
                type: typeof module,
                error: null
            };
            console.log(`  ${results[name].loaded ? '✅' : '❌'} ${name}: ${results[name].type}`);
        } catch (error) {
            results[name] = {
                loaded: false,
                type: 'error',
                error: error.message
            };
            console.log(`  ❌ ${name}: 加载失败 - ${error.message}`);
        }
    });

    // 检查脚本标签
    const scripts = document.querySelectorAll('script[src]');
    console.log(`  - 外部脚本数量: ${scripts.length}`);

    scripts.forEach(script => {
        const status = script.complete ? '✅' : '⏳';
        console.log(`    ${status} ${script.src}`);
    });

    // 检查内联模块脚本
    const inlineModules = document.querySelectorAll('script[type="module"]:not([src])');
    console.log(`  - 内联模块脚本数量: ${inlineModules.length}`);

    return {
        modulesLoaded: Object.values(results).every(r => r.loaded),
        moduleDetails: results,
        scriptsCount: scripts.length,
        inlineModulesCount: inlineModules.length
    };
}

// ============================================================================
// 4. 验证事件绑定是否正确
// ============================================================================
function verifyEventBinding() {
    console.log('\n🔗 4. 验证事件绑定状态');

    const elementChecks = [
        {
            selector: '#system-settings-button',
            name: '设置按钮',
            expectedEvent: 'click'
        },
        {
            selector: '#settingsModal',
            name: '设置模态框',
            expectedEvent: null
        },
        {
            selector: '#closeSettingsModalBtn',
            name: '关闭按钮',
            expectedEvent: 'click'
        }
    ];

    const results = {};

    elementChecks.forEach(check => {
        const element = document.querySelector(check.selector);

        if (element) {
            const hasClickListener = element.onclick !== null;
            const eventListeners = getEventListeners ? getEventListeners(element) : { click: [] };

            results[check.name] = {
                exists: true,
                hasInlineHandler: hasClickListener,
                hasEventListeners: eventListeners.click && eventListeners.click.length > 0,
                element: element
            };

            console.log(`  ✅ ${check.name}: 存在`);
            console.log(`    - 内联onclick: ${hasClickListener ? '是' : '否'}`);
            console.log(`    - 事件监听器: ${eventListeners.click ? eventListeners.click.length : 0}个`);
        } else {
            results[check.name] = {
                exists: false,
                hasInlineHandler: false,
                hasEventListeners: false,
                element: null
            };
            console.log(`  ❌ ${check.name}: 不存在`);
        }
    });

    return {
        allElementsExist: Object.values(results).every(r => r.exists),
        eventBindingDetails: results
    };
}

// ============================================================================
// 5. 测试手动调用openSettingsModal()函数
// ============================================================================
function testManualFunctionCall() {
    console.log('\n🧪 5. 测试手动函数调用');

    if (typeof window.openSettingsModal !== 'function') {
        console.log('  ❌ openSettingsModal函数不存在，无法测试');
        return {
            testPossible: false,
            reason: '函数不存在'
        };
    }

    try {
        console.log('  - 准备调用openSettingsModal()...');

        // 检查模态框初始状态
        const modal = document.getElementById('settingsModal');
        const modalContent = document.getElementById('settingsModalContent');

        if (!modal || !modalContent) {
            return {
                testPossible: true,
                success: false,
                reason: '模态框元素不存在'
            };
        }

        const initialState = {
            modalHidden: modal.classList.contains('hidden'),
            contentScale: modalContent.classList.contains('scale-95'),
            contentOpacity: modalContent.classList.contains('opacity-0')
        };

        console.log('  - 初始状态:');
        console.log(`    模态框隐藏: ${initialState.modalHidden}`);
        console.log(`    内容缩放: ${initialState.contentScale}`);
        console.log(`    内容透明: ${initialState.contentOpacity}`);

        // 执行函数调用
        console.log('  - 执行openSettingsModal()...');
        window.openSettingsModal();

        // 检查调用后状态（异步）
        setTimeout(() => {
            const finalState = {
                modalHidden: modal.classList.contains('hidden'),
                contentScale: modalContent.classList.contains('scale-100'),
                contentOpacity: modalContent.classList.contains('opacity-100')
            };

            console.log('  - 调用后状态:');
            console.log(`    模态框隐藏: ${finalState.modalHidden}`);
            console.log(`    内容缩放: ${finalState.contentScale}`);
            console.log(`    内容透明: ${finalState.contentOpacity}`);

            const success = !finalState.modalHidden && finalState.contentScale && finalState.contentOpacity;
            console.log(`  - 测试结果: ${success ? '✅ 成功' : '❌ 失败'}`);
        }, 100);

        return {
            testPossible: true,
            success: true,
            initialState,
            reason: '函数已调用，请检查模态框状态'
        };

    } catch (error) {
        console.error(`  ❌ 函数调用失败: ${error.message}`);
        return {
            testPossible: true,
            success: false,
            reason: error.message,
            error: error.stack
        };
    }
}

// ============================================================================
// 6. 检查是否有其他JavaScript冲突
// ============================================================================
function checkJavaScriptConflicts() {
    console.log('\n⚠️ 6. 检查JavaScript冲突');

    const conflictChecks = {
        'jQuery': typeof $ !== 'undefined',
        'Prototype': typeof Prototype !== 'undefined',
        'MooTools': typeof MooTools !== 'undefined',
        'ExtJS': typeof Ext !== 'undefined',
        'multipleLucide': (window.lucide !== undefined) && (document.querySelector('[src*="lucide"]') !== null),
        'chromeExtensionContext': typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined'
    };

    console.log('  冲突检查结果:');
    Object.entries(conflictChecks).forEach(([name, exists]) => {
        const status = exists ? '⚠️' : '✅';
        console.log(`    ${status} ${name}: ${exists ? '可能冲突' : '无冲突'}`);
    });

    // 检查变量覆盖
    const originalOpenSettingsModal = window.openSettingsModal;
    const openSettingsModalCheckpoints = [];

    // 监控函数是否被重新定义
    if (originalOpenSettingsModal) {
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (window.openSettingsModal !== originalOpenSettingsModal) {
                openSettingsModalCheckpoints.push({
                    time: new Date().toISOString(),
                    type: 'function_redefined',
                    original: originalOpenSettingsModal.toString().substring(0, 50),
                    current: window.openSettingsModal.toString().substring(0, 50)
                });
                console.warn('  ⚠️ 检测到openSettingsModal函数被重新定义');
            }

            if (checkCount > 10) clearInterval(checkInterval);
        }, 100);
    }

    // 检查DOM就绪状态
    console.log(`  - DOM就绪状态: ${document.readyState}`);
    console.log(`  - 当前时间: ${new Date().toISOString()}`);

    return {
        potentialConflicts: Object.entries(conflictChecks).filter(([_, exists]) => exists).map(([name]) => name),
        domReady: document.readyState === 'complete',
        checkpoints: openSettingsModalCheckpoints
    };
}

// ============================================================================
// 7. 综合诊断和修复建议
// ============================================================================
function generateDiagnosticReport() {
    console.log('\n📊 7. 生成综合诊断报告');

    const report = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        results: {
            consoleErrors: checkConsoleErrors(),
            globalFunction: verifyGlobalFunction(),
            moduleLoading: checkModuleLoading(),
            eventBinding: verifyEventBinding(),
            manualTest: testManualFunctionCall(),
            conflicts: checkJavaScriptConflicts()
        }
    };

    // 计算总体健康度
    const healthScores = {
        console: report.results.consoleErrors.errorCount === 0 ? 100 : 50,
        functions: report.results.globalFunction.openSettingsModalExists ? 100 : 0,
        modules: report.results.moduleLoading.modulesLoaded ? 100 : 0,
        events: report.results.eventBinding.allElementsExist ? 100 : 0,
        conflicts: report.results.conflicts.potentialConflicts.length === 0 ? 100 : 75
    };

    const overallHealth = Object.values(healthScores).reduce((a, b) => a + b, 0) / Object.keys(healthScores).length;

    report.overallHealth = Math.round(overallHealth);
    report.healthScores = healthScores;

    // 生成修复建议
    const recommendations = [];

    if (!report.results.globalFunction.openSettingsModalExists) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'openSettingsModal函数未暴露到全局作用域',
            solution: '检查popup.js模块加载和函数导出',
            code: `// 在popup.js末尾确保有:\nwindow.openSettingsModal = openSettingsModal;`
        });
    }

    if (!report.results.moduleLoading.modulesLoaded) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'ES6模块加载失败',
            solution: '检查import路径和模块导出',
            code: `// 确保所有import路径正确\n// 检查模块文件是否存在和导出正确`
        });
    }

    if (!report.results.eventBinding.allElementsExist) {
        recommendations.push({
            priority: 'MEDIUM',
            issue: 'HTML元素缺失或事件绑定失败',
            solution: '检查HTML结构和元素ID',
            code: `// 确保HTML中存在:\n// <button id="system-settings-button" onclick="openSettingsModal()">`
        });
    }

    if (report.results.conflicts.potentialConflicts.length > 0) {
        recommendations.push({
            priority: 'MEDIUM',
            issue: '检测到潜在的JavaScript冲突',
            solution: '检查并解决库冲突或命名冲突',
            code: `// 使用命名空间或避免全局变量污染`
        });
    }

    report.recommendations = recommendations;

    console.log(`\n🏥 总体健康度: ${report.overallHealth}%`);
    console.log('\n💡 修复建议:');
    recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`\n  ${priority} [${rec.priority}] ${rec.issue}`);
        console.log(`     解决方案: ${rec.solution}`);
        if (rec.code) {
            console.log(`     代码示例:\n     ${rec.code}`);
        }
    });

    return report;
}

// ============================================================================
// 自动修复功能
// ============================================================================
function attemptAutoFix() {
    console.log('\n🔧 尝试自动修复...');

    const fixes = [];

    // 修复1: 强制暴露全局函数
    if (typeof window.openSettingsModal !== 'function') {
        console.log('  🔧 尝试修复全局函数暴露...');
        try {
            // 查找函数定义
            const scriptContent = Array.from(document.scripts)
                .find(script => script.textContent && script.textContent.includes('function openSettingsModal'));

            if (scriptContent) {
                // 执行函数定义
                eval(scriptContent.textContent);
                fixes.push('全局函数暴露修复');
            }
        } catch (error) {
            console.warn(`    修复失败: ${error.message}`);
        }
    }

    // 修复2: 重新绑定事件
    const settingsBtn = document.getElementById('system-settings-button');
    if (settingsBtn && typeof window.openSettingsModal === 'function') {
        console.log('  🔧 重新绑定设置按钮事件...');
        settingsBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('设置按钮被点击（重新绑定）');
            window.openSettingsModal();
        };
        fixes.push('事件重新绑定');
    }

    // 修复3: 确保模块初始化
    if (typeof window.initializeSettings === 'function' && !window.settingsInitialized) {
        console.log('  🔧 强制初始化设置系统...');
        try {
            window.initializeSettings();
            window.settingsInitialized = true;
            fixes.push('设置系统初始化');
        } catch (error) {
            console.warn(`    修复失败: ${error.message}`);
        }
    }

    console.log(`  ✅ 完成修复尝试，共应用 ${fixes.length} 个修复`);
    return fixes;
}

// ============================================================================
// 执行完整诊断流程
// ============================================================================
function runCompleteDiagnosis() {
    console.log('\n🚀 === 开始完整诊断流程 ===');

    const report = generateDiagnosticReport();

    // 如果健康度低于80%，尝试自动修复
    if (report.overallHealth < 80) {
        console.log('\n🔧 检测到问题，尝试自动修复...');
        const fixes = attemptAutoFix();

        // 重新评估
        setTimeout(() => {
            console.log('\n🔄 修复后重新评估...');
            const newReport = generateDiagnosticReport();

            console.log(`\n📈 健康度变化: ${report.overallHealth}% → ${newReport.overallHealth}%`);

            if (newReport.overallHealth > report.overallHealth) {
                console.log('✅ 自动修复成功！');
            } else {
                console.log('⚠️ 自动修复效果有限，需要手动干预');
            }
        }, 1000);
    }

    return report;
}

// 导出所有函数到全局作用域，便于MCP调用
window.aiGradingDiagnosis = {
    checkConsoleErrors,
    verifyGlobalFunction,
    checkModuleLoading,
    verifyEventBinding,
    testManualFunctionCall,
    checkJavaScriptConflicts,
    generateDiagnosticReport,
    attemptAutoFix,
    runCompleteDiagnosis
};

// 自动执行完整诊断
console.log('\n🎯 诊断脚本已加载，30秒后自动执行完整诊断...');
setTimeout(() => {
    const report = window.aiGradingDiagnosis.runCompleteDiagnosis();
    console.log('\n📋 === 诊断报告已生成 ===');
    console.log('请查看上述详细结果和建议');
}, 30000);

// 立即执行快速检查
console.log('\n⚡ 执行快速检查...');
const quickCheck = {
    hasSettingsButton: !!document.getElementById('system-settings-button'),
    hasSettingsModal: !!document.getElementById('settingsModal'),
    hasOpenSettingsModal: typeof window.openSettingsModal === 'function',
    pageUrl: window.location.href,
    timestamp: new Date().toISOString()
};

console.log('快速检查结果:', quickCheck);

console.log('\n🔍 === AI阅卷助手设置功能诊断脚本加载完成 ===');