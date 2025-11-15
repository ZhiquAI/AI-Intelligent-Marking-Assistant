/**
 * Header Navigation Component
 * 头部导航栏组件 - 包含AI智能阅卷助手品牌、状态指示器和标签导航
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { createElement, addClass, removeClass } from '../../utils/dom-utils.js';

export class HeaderNavigation extends EventEmitter {
    constructor() {
        super();
        this.currentTab = 'ai-grading';
        this.statusIndicators = {
            imagePositioning: { status: 'disconnected', message: '图像定位未连接' },
            aiConnection: { status: 'disconnected', message: 'AI服务未连接' },
            gradingSettings: { status: 'ready', message: '评分设置就绪' }
        };
        this.init();
    }

    init() {
        this.createHeader();
        this.bindEvents();
        this.updateStatusIndicators();
    }

    createHeader() {
        this.element = createElement('div', {
            className: 'header-navigation',
            innerHTML: `
                <div class="header-brand">
                    <div class="brand-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M16 2C9.373 2 4 7.373 4 14c0 5.3 3.438 9.8 8.206 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C24.565 23.795 28 19.295 28 14c0-6.627-5.373-12-12-12z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="brand-text">
                        <h1 class="brand-title">AI智能阅卷助手</h1>
                        <p class="brand-subtitle">智学网集成版 v5.0</p>
                    </div>
                </div>

                <div class="status-indicators">
                    <div class="status-item" data-status="image-positioning">
                        <div class="status-icon"></div>
                        <span class="status-label">图像定位</span>
                        <div class="status-tooltip"></div>
                    </div>
                    <div class="status-item" data-status="ai-connection">
                        <div class="status-icon"></div>
                        <span class="status-label">AI服务</span>
                        <div class="status-tooltip"></div>
                    </div>
                    <div class="status-item" data-status="grading-settings">
                        <div class="status-icon"></div>
                        <span class="status-label">评分设置</span>
                        <div class="status-tooltip"></div>
                    </div>
                </div>

                <nav class="tab-navigation">
                    <button class="tab-button active" data-tab="ai-grading">
                        <svg class="tab-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/>
                        </svg>
                        智能阅卷
                    </button>
                    <button class="tab-button" data-tab="manual-review">
                        <svg class="tab-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 12l-4-4h8l-4 4z" fill="currentColor"/>
                            <path d="M3 6h14v2H3V6zm0 4h14v2H3v-2z" fill="currentColor"/>
                        </svg>
                        人工复核
                    </button>
                    <button class="tab-button" data-tab="data-analysis">
                        <svg class="tab-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M2 18h16V2H2v16zm2-2v-4h4v4H4zm6 0v-6h4v6h-4zm6 0v-4h4v4h-4z" fill="currentColor"/>
                        </svg>
                        数据分析
                    </button>
                </nav>
            `
        });

        // Add CSS styles
        this.addStyles();
    }

    addStyles() {
        const style = createElement('style', {
            textContent: `
                .header-navigation {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    position: relative;
                    z-index: 1000;
                }

                .header-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .brand-icon {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                }

                .brand-icon svg {
                    color: #ffffff;
                }

                .brand-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0;
                    line-height: 1.2;
                }

                .brand-subtitle {
                    font-size: 12px;
                    opacity: 0.8;
                    margin: 0;
                    line-height: 1;
                }

                .status-indicators {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                }

                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                    cursor: pointer;
                    padding: 8px 12px;
                    border-radius: 6px;
                    transition: background-color 0.2s ease;
                }

                .status-item:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .status-icon {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    position: relative;
                    transition: all 0.3s ease;
                }

                .status-icon::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .status-item[data-status="connected"] .status-icon {
                    background-color: rgba(76, 175, 80, 0.2);
                    color: #4caf50;
                }

                .status-item[data-status="connecting"] .status-icon {
                    background-color: rgba(255, 152, 0, 0.2);
                    color: #ff9800;
                    animation: pulse 1.5s infinite;
                }

                .status-item[data-status="disconnected"] .status-icon {
                    background-color: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                }

                .status-item[data-status="ready"] .status-icon {
                    background-color: rgba(33, 150, 243, 0.2);
                    color: #2196f3;
                }

                .status-item[data-status="error"] .status-icon {
                    background-color: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                    animation: shake 0.5s infinite;
                }

                .status-label {
                    font-size: 13px;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .status-tooltip {
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s ease;
                    margin-top: 8px;
                    z-index: 1001;
                }

                .status-tooltip::before {
                    content: '';
                    position: absolute;
                    top: -4px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-bottom: 4px solid rgba(0, 0, 0, 0.9);
                }

                .status-item:hover .status-tooltip {
                    opacity: 1;
                    visibility: visible;
                }

                .tab-navigation {
                    display: flex;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 4px;
                    border-radius: 8px;
                    backdrop-filter: blur(10px);
                }

                .tab-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    border: none;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 14px;
                    font-weight: 500;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }

                .tab-button:hover {
                    color: white;
                    background: rgba(255, 255, 255, 0.1);
                }

                .tab-button.active {
                    color: white;
                    background: rgba(255, 255, 255, 0.2);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .tab-icon {
                    color: currentColor;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    75% { transform: translateX(2px); }
                }

                /* 响应式设计 */
                @media (max-width: 1024px) {
                    .header-navigation {
                        flex-direction: column;
                        gap: 16px;
                        padding: 16px;
                    }

                    .status-indicators {
                        order: 2;
                    }

                    .tab-navigation {
                        order: 3;
                        width: 100%;
                        justify-content: center;
                    }
                }

                @media (max-width: 768px) {
                    .brand-title {
                        font-size: 20px;
                    }

                    .status-indicators {
                        flex-wrap: wrap;
                        gap: 12px;
                        justify-content: center;
                    }

                    .status-item {
                        padding: 6px 10px;
                    }

                    .status-label {
                        font-size: 12px;
                    }

                    .tab-navigation {
                        flex-direction: column;
                        gap: 4px;
                    }

                    .tab-button {
                        justify-content: center;
                        padding: 8px 12px;
                        font-size: 13px;
                    }
                }

                @media (max-width: 480px) {
                    .header-brand {
                        flex-direction: column;
                        text-align: center;
                    }

                    .brand-subtitle {
                        font-size: 11px;
                    }

                    .status-indicators {
                        flex-direction: column;
                        gap: 8px;
                    }

                    .status-item {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `
        });
        document.head.appendChild(style);
    }

    bindEvents() {
        // Tab navigation
        this.element.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.tab-button');
            if (tabButton) {
                const tab = tabButton.dataset.tab;
                this.switchTab(tab);
            }
        });

        // Status indicator hover effects
        this.element.addEventListener('mouseenter', (e) => {
            const statusItem = e.target.closest('.status-item');
            if (statusItem) {
                const statusType = statusItem.dataset.status;
                const tooltip = statusItem.querySelector('.status-tooltip');
                const status = this.statusIndicators[statusType];
                if (status && tooltip) {
                    tooltip.textContent = status.message;
                }
            }
        }, true);
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // Update active tab button
        const buttons = this.element.querySelectorAll('.tab-button');
        buttons.forEach(button => {
            if (button.dataset.tab === tabName) {
                addClass(button, 'active');
            } else {
                removeClass(button, 'active');
            }
        });

        this.currentTab = tabName;
        this.emit('tab-changed', { tab: tabName });
    }

    updateStatus(statusType, status, message) {
        if (this.statusIndicators[statusType]) {
            this.statusIndicators[statusType] = { status, message };
            this.updateStatusIndicators();
        }
    }

    updateStatusIndicators() {
        Object.keys(this.statusIndicators).forEach(statusType => {
            const statusItem = this.element.querySelector(`[data-status="${statusType}"]`);
            if (statusItem) {
                const { status } = this.statusIndicators[statusType];
                statusItem.setAttribute('data-status', status);

                const tooltip = statusItem.querySelector('.status-tooltip');
                if (tooltip) {
                    tooltip.textContent = this.statusIndicators[statusType].message;
                }
            }
        });
    }

    getCurrentTab() {
        return this.currentTab;
    }

    getElement() {
        return this.element;
    }

    destroy() {
        if (this.element) {
            this.element.remove();
        }
        const style = document.head.querySelector('style[data-header-navigation]');
        if (style) {
            style.remove();
        }
    }
}
