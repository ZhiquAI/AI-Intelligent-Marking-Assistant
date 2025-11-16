/**
 * Enhanced Main Layout Component
 * 增强版主布局组件 - 使用新架构和安全工具
 */

import { TemplateLoader } from '../utils/template-loader.js';
import { EventEmitter } from '../../utils/event-emitter.js';
import { makeDraggable, makeDropZone } from '../components/shared/draggable.js';
import { createTabManager } from '../components/shared/tab-manager.js';
import { safeSetHTML, safeCreateElement, safeSetText } from '../utils/safe-html.js';
import { cssInjector } from '../utils/css-injector.js';
import { secureMessenger } from '../security/message-validator.js';

/**
 * 增强版主布局组件
 */
export class EnhancedMainLayout extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            // 布局选项
            draggable: true,
            resizable: true,
            minimizable: true,

            // 安全选项
            enableSecurityValidation: true,
            logSecurityEvents: true,

            // 主题选项
            theme: 'auto', // 'light', 'dark', 'auto'

            // 响应式选项
            responsive: true,
            mobileBreakpoint: 768,

            // 性能选项
            lazyLoad: true,
            virtualScroll: false,

            ...options
        };

        this.state = {
            isMinimized: false,
            isMaximized: false,
            currentTab: 'ai-grading',
            theme: this.options.theme,
            isLoaded: false,
            dragStarted: false
        };

        this.components = new Map();
        this.templates = new TemplateLoader();
        this.tabManager = null;
        this.cleanupFunctions = [];

        this.init();
    }

    /**
     * 初始化组件
     */
    async init() {
        try {
            // 加载样式
            await this.loadStyles();

            // 创建布局结构
            this.createLayout();

            // 初始化组件
            await this.initializeComponents();

            // 绑定事件
            this.bindEvents();

            // 初始化主题
            this.initializeTheme();

            // 注册消息处理器
            this.registerMessageHandlers();

            this.state.isLoaded = true;
            this.emit('layout-initialized', { timestamp: Date.now() });

            console.log('增强版主布局组件初始化完成');

        } catch (error) {
            console.error('主布局组件初始化失败:', error);
            throw error;
        }
    }

    /**
     * 加载样式
     */
    async loadStyles() {
        const styles = [
            'shared/variables.css',
            'shared/animations.css',
            'components/base.css',
            'content/main-panel.css'
        ];

        for (const stylePath of styles) {
            try {
                await cssInjector.inject(stylePath);
            } catch (error) {
                console.warn(`样式加载失败: ${stylePath}`, error);
            }
        }
    }

    /**
     * 创建布局结构
     */
    createLayout() {
        this.element = safeCreateElement('div', {
            className: 'zhixue-enhanced-main-layout',
            id: 'zhixue-main-layout',
            attributes: {
                'role': 'application',
                'aria-label': 'AI智能阅卷助手主界面'
            }
        });

        // 使用模板加载器加载主布局模板
        this.templates.load('enhanced-main-layout').then(template => {
            if (template) {
                safeSetHTML(this.element, template);
            } else {
                // 回退到内联模板
                this.createFallbackLayout();
            }
        }).catch(error => {
            console.warn('模板加载失败，使用回退布局:', error);
            this.createFallbackLayout();
        });

        // 添加到页面
        document.body.appendChild(this.element);

        // 初始化拖拽功能
        if (this.options.draggable) {
            this.initializeDraggable();
        }
    }

    /**
     * 创建回退布局
     */
    createFallbackLayout() {
        safeSetHTML(this.element, `
            <div class="layout-container">
                <header class="layout-header" role="banner">
                    <div class="header-content">
                        <div class="logo-section">
                            <div class="logo" aria-label="智学网AI助手">
                                <span class="logo-text">AI</span>
                            </div>
                            <h1 class="app-title">智学网AI智能阅卷助手</h1>
                        </div>
                        <div class="header-actions">
                            <button class="header-btn settings-btn"
                                    id="settings-btn"
                                    aria-label="设置"
                                    title="模型设置">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h-2a1 1 0 01-1-1v-2z"/>
                                </svg>
                            </button>
                            <button class="header-btn minimize-btn"
                                    id="minimize-btn"
                                    aria-label="最小化"
                                    title="最小化窗口">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M5 10h10M4 7h12M4 13h12"/>
                                </svg>
                            </button>
                            <button class="header-btn close-btn"
                                    id="close-btn"
                                    aria-label="关闭"
                                    title="关闭窗口">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 01-1.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 1.414z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                <div class="status-bar" role="status">
                    <div class="status-items">
                        <div class="status-item" data-status="image-detection">
                            <div class="status-indicator"></div>
                            <span class="status-text">图片定位</span>
                        </div>
                        <div class="status-divider"></div>
                        <div class="status-item" data-status="ai-connection">
                            <div class="status-indicator"></div>
                            <span class="status-text">AI链接</span>
                        </div>
                        <div class="status-divider"></div>
                        <div class="status-item" data-status="config-loaded">
                            <div class="status-indicator"></div>
                            <span class="status-text">配置就绪</span>
                        </div>
                    </div>
                </div>

                <div class="main-content" role="main">
                    <nav class="tab-navigation" role="tablist">
                        <div class="tab-list">
                            <button class="tab-btn active"
                                    role="tab"
                                    data-tab="ai-grading"
                                    aria-selected="true"
                                    aria-controls="panel-ai-grading">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 6h12M2 10h8m-4-8v12"/>
                                </svg>
                                <span>智能阅卷</span>
                            </button>
                            <button class="tab-btn"
                                    role="tab"
                                    data-tab="manual-review"
                                    aria-selected="false"
                                    aria-controls="panel-manual-review">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2zM2 6h12v8H2V6z"/>
                                </svg>
                                <span>人工复核</span>
                            </button>
                            <button class="tab-btn"
                                    role="tab"
                                    data-tab="data-analysis"
                                    aria-selected="false"
                                    aria-controls="panel-data-analysis">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 14h12M4 10v4M8 6v8M12 2v12"/>
                                </svg>
                                <span>数据分析</span>
                            </button>
                        </div>
                    </nav>

                    <div class="content-panels">
                        <section class="content-panel active"
                                 id="panel-ai-grading"
                                 role="tabpanel"
                                 aria-labelledby="tab-ai-grading">
                            <div class="panel-header">
                                <h2>AI智能阅卷</h2>
                                <div class="panel-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">今日已阅:</span>
                                        <span class="stat-value" id="today-graded">0</span>
                                    </div>
                                </div>
                            </div>
                            <div class="upload-section">
                                <div class="upload-area" id="upload-area">
                                    <div class="upload-content">
                                        <div class="upload-icon">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                                <path d="M7 10l5 5 5-5M7 14l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                            </svg>
                                        </div>
                                        <h3>拖拽图片到此处或点击上传</h3>
                                        <p>支持 JPG、PNG、GIF 格式，最大 10MB</p>
                                        <button class="upload-btn primary" id="upload-btn">
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-4-4l4.586-4.586a2 2 0 012.828 0L16 16m-4-4l-4.586 4.586a2 2 0 01-2.828 0L4 16"/>
                                            </svg>
                                            选择文件
                                        </button>
                                        <input type="file"
                                               id="file-input"
                                               class="file-input"
                                               accept="image/*"
                                               multiple
                                               aria-label="选择图片文件">
                                    </div>
                                </div>
                            </div>
                            <div class="action-section">
                                <div class="action-buttons">
                                    <button class="action-btn primary" id="ai-trial-btn">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                        </svg>
                                        AI试评
                                    </button>
                                    <button class="action-btn secondary" id="auto-grade-btn">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                        </svg>
                                        自动阅卷
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section class="content-panel"
                                 id="panel-manual-review"
                                 role="tabpanel"
                                 aria-labelledby="tab-manual-review"
                                 aria-hidden="true">
                            <div class="panel-header">
                                <h2>人工复核</h2>
                            </div>
                            <div class="empty-state">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                <h3>人工复核功能</h3>
                                <p>查看和调整AI评分结果的功能开发中...</p>
                            </div>
                        </section>

                        <section class="content-panel"
                                 id="panel-data-analysis"
                                 role="tabpanel"
                                 aria-labelledby="tab-data-analysis"
                                 aria-hidden="true">
                            <div class="panel-header">
                                <h2>数据分析</h2>
                            </div>
                            <div class="empty-state">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                                <h3>数据分析功能</h3>
                                <p>评分统计和数据分析功能开发中...</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `);
    }

    /**
     * 初始化组件
     */
    async initializeComponents() {
        // 初始化标签页管理器
        this.tabManager = createTabManager(this.element, {
            tabSelector: '.tab-btn',
            contentSelector: '.content-panel',
            defaultTab: 'ai-grading',
            keyboardNavigation: true,
            rememberState: true,
            animationDuration: 300
        });

        // 绑定标签页事件
        this.tabManager.on('tab-switched', (data) => {
            this.handleTabSwitch(data);
        });

        // 初始化上传区域拖拽
        const uploadArea = this.element.querySelector('#upload-area');
        if (uploadArea) {
            const cleanupDrag = makeDropZone(uploadArea, {
                acceptedTypes: ['Files'],
                dragOverClass: 'drag-over',
                onDrop: (data) => {
                    this.handleFileDrop(data.files);
                }
            });
            this.cleanupFunctions.push(cleanupDrag);
        }
    }

    /**
     * 初始化拖拽功能
     */
    initializeDraggable() {
        const header = this.element.querySelector('.layout-header');
        if (!header) return;

        const cleanupDrag = makeDraggable(this.element, {
            handle: header,
            containment: 'viewport',
            cursor: 'move',
            onDragStart: (data) => {
                this.state.dragStarted = true;
                this.element.classList.add('dragging');
                this.emit('drag-start', data);
            },
            onDrag: (data) => {
                this.emit('drag-move', data);
            },
            onDragEnd: (data) => {
                this.state.dragStarted = false;
                this.element.classList.remove('dragging');
                this.emit('drag-end', data);
            }
        });

        this.cleanupFunctions.push(cleanupDrag);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 头部按钮事件
        this.bindHeaderEvents();

        // 文件上传事件
        this.bindUploadEvents();

        // 标签页点击事件
        this.bindTabEvents();

        // 键盘快捷键
        this.bindKeyboardEvents();

        // 窗口大小调整
        if (this.options.resizable) {
            this.bindResizeEvents();
        }
    }

    /**
     * 绑定头部事件
     */
    bindHeaderEvents() {
        const settingsBtn = this.element.querySelector('#settings-btn');
        const minimizeBtn = this.element.querySelector('#minimize-btn');
        const closeBtn = this.element.querySelector('#close-btn');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.emit('settings-requested', { timestamp: Date.now() });
            });
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.toggleMinimize();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.emit('close-requested', { timestamp: Date.now() });
            });
        }
    }

    /**
     * 绑定上传事件
     */
    bindUploadEvents() {
        const uploadBtn = this.element.querySelector('#upload-btn');
        const fileInput = this.element.querySelector('#file-input');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                fileInput?.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }
    }

    /**
     * 绑定标签页事件
     */
    bindTabEvents() {
        const tabButtons = this.element.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                if (tabName && this.tabManager) {
                    this.tabManager.switchTo(tabName, {
                        trigger: 'click'
                    });
                }
            });
        });
    }

    /**
     * 绑定键盘快捷键
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // ESC键关闭
            if (e.key === 'Escape') {
                this.emit('close-requested', { timestamp: Date.now() });
                return;
            }

            // Ctrl+M 最小化
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.toggleMinimize();
                return;
            }

            // Ctrl+S 设置
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.emit('settings-requested', { timestamp: Date.now() });
                return;
            }

            // Tab键在标签页间切换
            if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
                const activeTab = this.tabManager?.getActiveTab();
                if (activeTab) {
                    const tabs = ['ai-grading', 'manual-review', 'data-analysis'];
                    const currentIndex = tabs.indexOf(activeTab);
                    const nextIndex = e.shiftKey
                        ? (currentIndex - 1 + tabs.length) % tabs.length
                        : (currentIndex + 1) % tabs.length;

                    e.preventDefault();
                    this.tabManager?.switchTo(tabs[nextIndex]);
                }
            }
        });
    }

    /**
     * 绑定窗口调整事件
     */
    bindResizeEvents() {
        // 实现窗口大小调整逻辑
        // 这里可以添加resize handle等
    }

    /**
     * 初始化主题
     */
    initializeTheme() {
        if (this.options.theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
            this.updateTheme(prefersDark.matches ? 'dark' : 'light');

            prefersDark.addEventListener('change', (e) => {
                this.updateTheme(e.matches ? 'dark' : 'light');
            });
        } else {
            this.updateTheme(this.options.theme);
        }
    }

    /**
     * 更新主题
     */
    updateTheme(theme) {
        this.state.theme = theme;

        if (theme === 'dark') {
            this.element.classList.add('dark-mode');
        } else {
            this.element.classList.remove('dark-mode');
        }

        this.emit('theme-changed', { theme, timestamp: Date.now() });
    }

    /**
     * 注册消息处理器
     */
    registerMessageHandlers() {
        secureMessenger.registerHandler('layout.update-theme', (message) => {
            this.updateTheme(message.data.theme);
            return { success: true };
        });

        secureMessenger.registerHandler('layout.switch-tab', (message) => {
            if (this.tabManager) {
                return this.tabManager.switchTo(message.data.tab);
            }
            return { success: false, error: 'Tab manager not initialized' };
        });

        secureMessenger.registerHandler('layout.get-status', () => {
            return {
                isMinimized: this.state.isMinimized,
                currentTab: this.state.currentTab,
                theme: this.state.theme,
                isLoaded: this.state.isLoaded
            };
        });
    }

    /**
     * 处理标签页切换
     */
    handleTabSwitch(data) {
        const { tab } = data;
        this.state.currentTab = tab;

        // 更新ARIA属性
        const tabButtons = this.element.querySelectorAll('.tab-btn');
        const panels = this.element.querySelectorAll('.content-panel');

        tabButtons.forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.classList.toggle('active', isActive);
        });

        panels.forEach(panel => {
            const isActive = panel.id === `panel-${tab}`;
            panel.setAttribute('aria-hidden', !isActive);
            panel.classList.toggle('active', isActive);
        });

        this.emit('tab-changed', { tab, timestamp: Date.now() });
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(files) {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            this.showNotification('请选择图片文件', 'warning');
            return;
        }

        this.emit('files-selected', { files: imageFiles });
    }

    /**
     * 处理文件拖放
     */
    handleFileDrop(files) {
        if (!files || files.length === 0) return;

        this.handleFileSelect(files);
    }

    /**
     * 切换最小化状态
     */
    toggleMinimize() {
        this.state.isMinimized = !this.state.isMinimized;

        if (this.state.isMinimized) {
            this.element.classList.add('minimized');
        } else {
            this.element.classList.remove('minimized');
        }

        this.emit('minimize-toggled', {
            isMinimized: this.state.isMinimized,
            timestamp: Date.now()
        });
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 这里可以实现一个通知组件
        const notification = safeCreateElement('div', {
            className: `notification notification-${type}`,
            innerHTML: `
                <span class="notification-message">${this.escapeHtml(message)}</span>
                <button class="notification-close" aria-label="关闭通知">×</button>
            `
        });

        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);

        // 手动关闭
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });
        }
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 更新状态指示器
     */
    updateStatusIndicator(status, isActive = true) {
        const statusItem = this.element.querySelector(`[data-status="${status}"]`);
        if (statusItem) {
            const indicator = statusItem.querySelector('.status-indicator');
            if (indicator) {
                indicator.classList.toggle('active', isActive);
            }
        }
    }

    /**
     * 更新统计信息
     */
    updateStats(stats) {
        if (stats.todayGraded !== undefined) {
            const todayGraded = this.element.querySelector('#today-graded');
            if (todayGraded) {
                safeSetText(todayGraded, stats.todayGraded.toString());
            }
        }

        if (stats.averageTime !== undefined) {
            // 更新平均用时统计
        }

        if (stats.accuracy !== undefined) {
            // 更新准确率统计
        }
    }

    /**
     * 获取当前状态
     */
    getState() {
        return {
            ...this.state,
            tabManager: this.tabManager ? {
                activeTab: this.tabManager.getActiveTab(),
                allTabs: this.tabManager.getTabNames(),
                history: this.tabManager.getHistory()
            } : null
        };
    }

    /**
     * 获取元素
     */
    getElement() {
        return this.element;
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 清理事件监听器
        this.cleanupFunctions.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.cleanupFunctions = [];

        // 销毁子组件
        if (this.tabManager) {
            this.tabManager.destroy();
        }

        // 清理DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        // 移除事件监听器
        this.removeAllListeners();

        // 重置状态
        this.state = {
            isMinimized: false,
            isMaximized: false,
            currentTab: null,
            theme: this.options.theme,
            isLoaded: false,
            dragStarted: false
        };

        this.emit('layout-destroyed', { timestamp: Date.now() });
    }
}

// 导出组件
export default EnhancedMainLayout;