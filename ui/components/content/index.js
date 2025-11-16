/**
 * Content UI module generated from legacy content-enhanced.js
 */

export function addGlobalStyles() {
    (function ensureHtml2Canvas() {
        if (window.html2canvas) return;
        try {
            const localUrl = chrome.runtime?.getURL?.('libs/html2canvas.min.js');
            if (localUrl) {
                const s = document.createElement('script');
                s.src = localUrl;
                s.async = true;
                document.head.appendChild(s);
            }
        } catch {}
    })();

    (function ensureLocalStylesheet(){
        try {
            if (!document.querySelector('link[data-zhixue-ui-css]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = chrome.runtime?.getURL?.('ui/styles/main.css') || '';
                link.setAttribute('data-zhixue-ui-css', '1');
                document.head.appendChild(link);
            }
            const addCss = (p) => {
                const sel = `link[data-zhixue-ui-css-extra="${p}"]`;
                if (document.querySelector(sel)) return;
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = chrome.runtime?.getURL?.(`ui/styles/${p}`) || '';
                link.setAttribute('data-zhixue-ui-css-extra', p);
                document.head.appendChild(link);
            };
            addCss('shared/variables.css');
            addCss('shared/animations.css');
            addCss('content/main-panel.css');
            addCss('content/settings-modal.css');
        } catch {}
    })();

    try {
        const setVar = (val) => {
            const px = (parseInt(val, 10) || 360) + 'px';
            document.documentElement.style.setProperty('--zhixue-ai-drawer-width', px);
        };
        if (chrome.storage?.local) {
            chrome.storage.local.get(['drawerWidth'], (res) => setVar(res.drawerWidth));
            chrome.storage.onChanged?.addListener((changes, area) => {
                if (area === 'local' && changes.drawerWidth) setVar(changes.drawerWidth.newValue);
            });
        } else {
            setVar(360);
        }
    } catch {}
}

export function createMainPanel() {
    const panel = document.createElement('div');
    panel.className = 'zhixue-ai-main';
    panel.id = 'zhixue-ai-main';

    (async () => {
        try {
            const loaderPath = chrome.runtime.getURL('ui/utils/template-loader.js');
            const mod = await import(loaderPath);
            const html = await mod.loadTemplate('main-panel.html');
            panel.innerHTML = html;

            try {
                const scoreContainer = panel.querySelector('#score-panel-container');
                if (scoreContainer) {
                    const scoreHtml = await mod.loadTemplate('score-panel.html');
                    scoreContainer.innerHTML = scoreHtml;
                    const dimsWrap = scoreContainer.querySelector('.zhixue-ai-dimensions');
                    if (dimsWrap) {
                        const dimsHtml = await mod.loadTemplate('dimensions-list.html');
                        dimsWrap.innerHTML = dimsHtml;
                    }
                }
            } catch {}

            const closeBtn = panel.querySelector('.zhixue-ai-close');
            closeBtn?.addEventListener('click', () => {
                panel.classList.remove('open');
                document.documentElement.classList.remove('zhixue-ai-no-scroll','zhixue-ai-push');
            });

            const trialBtn = panel.querySelector('#aiTrialBtn');
            trialBtn?.addEventListener('click', () => {
                window.zhixueAIManager?.aiTrial?.();
            });

            const autoBtn = panel.querySelector('#aiAutoGradeBtn');
            autoBtn?.addEventListener('click', () => {
                window.zhixueAIManager?.aiAutoGrade?.();
            });

            const settingsBtn = panel.querySelector('#modelSettingsBtn');
            settingsBtn?.addEventListener('click', async () => {
                if (window.zhixueAIManager?.openModelSettings) {
                    window.zhixueAIManager.openModelSettings();
                    return;
                }
                try {
                    const p = chrome.runtime.getURL('ui/utils/template-loader.js');
                    const mod2 = await import(p);
                    const html2 = await mod2.loadTemplate('settings-modal.html');
                    const wrap = document.createElement('div');
                    wrap.innerHTML = html2;
                    document.body.appendChild(wrap);
                    const closeBtn2 = wrap.querySelector('.settings-close-btn');
                    const overlay = wrap.querySelector('.zhixue-ai-settings-overlay');
                    const closeFn = () => { wrap.parentNode && wrap.parentNode.removeChild(wrap); };
                    closeBtn2 && closeBtn2.addEventListener('click', closeFn);
                    overlay && overlay.addEventListener('click', closeFn);
                } catch {}
            });

            try {
                if (panel.querySelector('.zhixue-ai-tab')) {
                    const path = chrome.runtime.getURL('ui/components/shared/tab-manager.js');
                    const m = await import(path);
                    const tm = new m.TabManager(panel);
                    tm.bind();
                }
            } catch {}
            try {
                const reasonContainer = panel.querySelector('#reason-panel-container');
                if (reasonContainer) {
                    const reasonHtml = await mod.loadTemplate('reason-panel.html');
                    reasonContainer.innerHTML = reasonHtml;
                }
            } catch {}
        } catch {
            panel.innerHTML = '<div class="zhixue-ai-main-content"><div class="zhixue-ai-content">模板加载失败</div></div>';
        }
    })();

    document.body.appendChild(panel);
    return panel;
}

/**
 * 创建切换按钮
 */
export function createToggleButton(panel) {
    const button = document.createElement('button');
    button.className = 'zhixue-ai-toggle';
    button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="icon">
            <path d="M12 2L4 7v10c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V9c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v7c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V7l-8-5z" fill="currentColor"/>
        </svg>
    `;
    let draggableMod = null;
    try {
        const p = chrome.runtime.getURL('ui/components/shared/draggable.js');
        import(p).then(m => {
            draggableMod = m;
            m.makeDraggable(button);
        }).catch(() => {});
    } catch {}

    // 初始化位置（将right/top转换为left/top）
    setTimeout(() => {
        const rect = button.getBoundingClientRect();
        button.style.left = rect.left + 'px';
        button.style.top = rect.top + 'px';
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        console.log('✅ 浮动按钮位置已初始化');
    }, 100);

    button.addEventListener('click', (e) => {
        if (draggableMod && draggableMod.dragState && draggableMod.dragState.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (typeof isDraggingState !== 'undefined' && isDraggingState) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        console.log('✅ 点击浮动按钮，打开面板');
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
            panel.classList.remove('open');
            document.documentElement.classList.remove('zhixue-ai-no-scroll','zhixue-ai-push');
        } else {
            panel.classList.add('open');
            document.documentElement.classList.add('zhixue-ai-no-scroll','zhixue-ai-push');
        }
    });

    // 添加鼠标悬停效果
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
    });

    document.body.appendChild(button);
    return button;
}

/**
 * 使元素可拖拽
 */
// 全局变量来跟踪拖拽状态
let isDraggingState = false;

function makeDraggable(element) {
    let startX, startY;
    let initialX, initialY;
    let hasMoved = false;

    element.addEventListener('mousedown', dragStart);
    element.addEventListener('touchstart', dragStart);

    function dragStart(e) {
        // 记录初始位置
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        // 获取当前偏移量
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        // 添加事件监听
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('touchend', dragEnd);

        hasMoved = false;

        // 设置拖拽状态
        element.style.cursor = 'grabbing';
    }

    function dragMove(e) {
        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = currentX - startX;
        const dy = currentY - startY;

        // 如果移动超过3px，认为是拖拽
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
            isDraggingState = true;

            // 添加拖拽时的视觉反馈
            element.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.8)';
            element.style.transform = 'scale(1.15)';
            element.style.zIndex = '1000001';

            // 计算新位置
            let newX = initialX + dx;
            let newY = initialY + dy;

            // 限制在视窗范围内
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            // 应用位置
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
    }

    function dragEnd() {
        // 移除事件监听
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', dragMove);
        document.removeEventListener('touchend', dragEnd);

        // 恢复拖拽时的视觉反馈
        element.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        element.style.transform = 'scale(1)';
        element.style.zIndex = '1000000';

        // 重置拖拽状态
        setTimeout(() => {
            isDraggingState = false;
        }, 50);

        // 重置样式
        element.style.cursor = 'grab';
    }
}

/**
 * 绑定Tab切换事件
 */
export function bindTabEvents() {
    const tabs = document.querySelectorAll('.zhixue-ai-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有活跃状态
            tabs.forEach(t => t.classList.remove('active'));
            // 添加活跃状态到当前tab
            tab.classList.add('active');

            // 隐藏所有tab内容
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });

            // 显示对应的tab内容
            const tabName = tab.dataset.tab;
            const targetContent = document.getElementById(`tab-${tabName}`);
            if (targetContent) {
                targetContent.style.display = 'block';
            }
        });
    });
}

export function setupGlobalErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ 未处理的Promise拒绝:', event.reason);
        event.preventDefault();
    });

    window.addEventListener('error', (event) => {
        console.error('❌ 全局JavaScript错误:', event.error);
    });

    console.log('✅ 全局错误处理已设置');
}
export async function initializeUI(context) {
    addGlobalStyles();
    const panel = createMainPanel();
    if (!panel) throw new Error('创建面板失败');
    const toggleButton = createToggleButton(panel);
    if (!toggleButton) throw new Error('创建切换按钮失败');
    bindTabEvents();
    setupGlobalErrorHandling();
    return { panel, toggleButton, context };
}
