/**
 * Main Layout Component
 * 主布局组件 - 管理整体应用布局和标签内容切换
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { HeaderNavigation } from './header-navigation.js';
import { AIScoreDisplay } from './ai-score-display.js';
import { Charts } from './charts.js';
import { createElement, addClass, removeClass } from '../../utils/dom-utils.js';

export class MainLayout extends EventEmitter {
    constructor() {
        super();
        this.currentTab = 'ai-grading';
        this.components = {};
        this.init();
    }

    init() {
        this.createLayout();
        this.setupComponents();
        this.bindEvents();
    }

    createLayout() {
        this.element = createElement('div', {
            className: 'main-layout',
            innerHTML: `
                <div class="layout-header"></div>
                <div class="layout-content">
                    <div class="tab-content active" data-tab="ai-grading">
                        <div class="ai-grading-container">
                            <div class="upload-section">
                                <div class="upload-area">
                                    <div class="upload-placeholder">
                                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                            <path d="M32 8C21.4 8 13 16.4 13 27c0 10.2 6.6 18.9 15.7 21.9.7.2 1-.4 1-.9 0-.4 0-1.6-.1-3.1-6.4 1.4-7.8-3.1-7.8-3.1-1-2.7-2.5-3.4-2.5-3.4-2-1.5.2-1.4.2-1.4 2.2.2 3.4 2.4 3.4 2.4 2 3.5 5.3 2.5 6.6 1.9.2-1.5.8-2.5 1.5-3.1-5.1-.6-10.5-2.5-10.5-11.3 0-2.5.9-4.5 2.4-6.1-.3-.6-1-3 .2-6.2 0 0 2-.6 6.3 2.4 1.8-.5 3.8-.8 5.7-.8 1.9 0 3.9.3 5.7.8 4.4-3 6.3-2.4 6.3-2.4 1.2 3.2.5 5.6.2 6.2 1.5 1.6 2.4 3.6 2.4 6.1 0 8.8-5.3 10.8-10.4 11.3.8.7 1.5 2.1 1.5 4.2 0 3.1-.1 5.6-.1 6.3 0 .6.4 1.3 1.6 1.1C44.5 52.2 51 46.5 51 36c0-11-8.9-20-20-20z" fill="currentColor" opacity="0.3"/>
                                            <path d="M32 20v24m-12-12h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                        </svg>
                                        <h3>拖拽图片到此处或点击上传</h3>
                                        <p>支持 JPG、PNG、GIF 格式，最大 10MB</p>
                                        <button class="upload-btn">选择文件</button>
                                    </div>
                                    <input type="file" class="file-input" accept="image/*" multiple>
                                </div>
                            </div>
                            <div class="preview-section" style="display: none;">
                                <div class="preview-header">
                                    <h3>图片预览</h3>
                                    <button class="clear-btn">清除全部</button>
                                </div>
                                <div class="preview-grid"></div>
                            </div>
                            <div class="ai-grading-section" style="display: none;">
                                <div class="grading-header">
                                    <h3>AI评分结果</h3>
                                    <div class="grading-stats">
                                        <div class="stat-item">
                                            <span class="stat-label">今日已阅：</span>
                                            <span class="stat-value" id="today-graded">0</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-label">平均用时：</span>
                                            <span class="stat-value" id="avg-time">--</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-label">准确率：</span>
                                            <span class="stat-value" id="accuracy">--</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="stat-label">置信度：</span>
                                            <span class="stat-value" id="confidence">--</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="ai-score-display-container"></div>
                                <div class="grading-actions">
                                    <button class="btn btn-primary ai-grade-btn">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/>
                                        </svg>
                                        AI评分
                                    </button>
                                    <button class="btn btn-secondary ai-trial-btn">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M8 2v4l3-3-3-3zM2 8h4l-3-3-1 1zM8 14v-4l-3 3 3 3zM14 8h-4l3 3 1-1z" fill="currentColor"/>
                                        </svg>
                                        试读
                                    </button>
                                    <button class="btn btn-secondary pause-btn" style="display: none;">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M5 2v12M11 2v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                        </svg>
                                        暂停
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content" data-tab="manual-review">
                        <div class="manual-review-container">
                            <div class="review-header-section">
                                <h3>人工复核</h3>
                                <p>查看需要人工复核的试卷，调整AI评分结果</p>
                            </div>

                            <div class="review-controls">
                                <div class="filter-section">
                                    <label>筛选条件：</label>
                                    <select id="review-filter">
                                        <option value="all">全部</option>
                                        <option value="low-confidence">低置信度</option>
                                        <option value="needs-review">需要复核</option>
                                        <option value="disputed">有争议</option>
                                    </select>
                                </div>
                                <div class="stats-section">
                                    <div class="stat-item">
                                        <span class="stat-label">待复核：</span>
                                        <span class="stat-value" id="pending-count">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">已复核：</span>
                                        <span class="stat-value" id="completed-count">0</span>
                                    </div>
                                </div>
                            </div>

                            <div class="review-list-container">
                                <div class="review-list-header">
                                    <div class="header-item">学生</div>
                                    <div class="header-item">题号</div>
                                    <div class="header-item">AI评分</div>
                                    <div class="header-item">置信度</div>
                                    <div class="header-item">状态</div>
                                    <div class="header-item">操作</div>
                                </div>
                                <div class="review-list" id="review-list">
                                    <!-- 动态生成复核列表 -->
                                </div>
                            </div>

                            <div class="review-actions-bar">
                                <button class="btn btn-primary" id="batch-review-btn">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M2 6h12M2 10h8m-4-8v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    批量复核
                                </button>
                                <button class="btn btn-secondary" id="export-reviews-btn">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 2v8M4 6l4-4 4 4M2 14h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    导出复核记录
                                </button>
                                <button class="btn btn-secondary" id="view-statistics-btn">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M2 14h12M4 10v4M8 6v8M12 2v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    查看统计
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="tab-content" data-tab="data-analysis">
                        <div class="data-analysis-container">
                            <div class="analysis-header">
                                <h3>数据分析</h3>
                                <p>查看评分统计、准确率分析和趋势图表</p>
                            </div>
                            <div class="charts-wrapper"></div>
                        </div>
                    </div>
                </div>
            `
        });

        this.addStyles();
    }

    addStyles() {
        const style = createElement('style', {
            textContent: `
                .main-layout {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: #f5f7fa;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .layout-header {
                    flex-shrink: 0;
                }

                .layout-content {
                    flex: 1;
                    overflow: hidden;
                    position: relative;
                }

                .tab-content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    overflow-y: auto;
                    padding: 24px;
                }

                .tab-content.active {
                    opacity: 1;
                    visibility: visible;
                }

                /* AI Grading Tab Styles */
                .ai-grading-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .upload-section {
                    margin-bottom: 32px;
                }

                .upload-area {
                    border: 2px dashed #d1d5db;
                    border-radius: 12px;
                    padding: 48px 24px;
                    text-align: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    background: white;
                }

                .upload-area:hover {
                    border-color: #667eea;
                    background-color: #f8faff;
                }

                .upload-area.drag-over {
                    border-color: #667eea;
                    background-color: #f0f4ff;
                    transform: scale(1.02);
                }

                .upload-placeholder svg {
                    color: #9ca3af;
                    margin-bottom: 16px;
                }

                .upload-placeholder h3 {
                    font-size: 20px;
                    color: #374151;
                    margin: 0 0 8px 0;
                    font-weight: 600;
                }

                .upload-placeholder p {
                    color: #6b7280;
                    margin: 0 0 24px 0;
                    font-size: 14px;
                }

                .upload-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .upload-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .file-input {
                    display: none;
                }

                .preview-section {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .preview-header h3 {
                    margin: 0;
                    font-size: 18px;
                    color: #374151;
                    font-weight: 600;
                }

                .clear-btn {
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .clear-btn:hover {
                    background: #dc2626;
                }

                .preview-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                }

                /* Manual Review Tab Styles */
                .manual-review-container,
                .data-analysis-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .review-placeholder,
                .analysis-placeholder {
                    background: white;
                    border-radius: 12px;
                    padding: 48px 24px;
                    text-align: center;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .review-placeholder svg,
                .analysis-placeholder svg {
                    color: #9ca3af;
                    margin-bottom: 16px;
                }

                .review-placeholder h3,
                .analysis-placeholder h3 {
                    font-size: 20px;
                    color: #374151;
                    margin: 0 0 8px 0;
                    font-weight: 600;
                }

                .review-placeholder p,
                .analysis-placeholder p {
                    color: #6b7280;
                    margin: 0;
                    font-size: 14px;
                }

                /* Scrollbar Styling */
                .tab-content::-webkit-scrollbar {
                    width: 8px;
                }

                .tab-content::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }

                .tab-content::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 4px;
                }

                .tab-content::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .tab-content {
                        padding: 16px;
                    }

                    .preview-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 12px;
                    }

                    .upload-area {
                        padding: 32px 16px;
                    }

                    .upload-placeholder h3 {
                        font-size: 18px;
                    }

                    .preview-section {
                        padding: 16px;
                    }
                }

                @media (max-width: 480px) {
                    .preview-grid {
                        grid-template-columns: 1fr;
                    }

                    .upload-placeholder svg {
                        width: 48px;
                        height: 48px;
                    }

                    .upload-placeholder h3 {
                        font-size: 16px;
                    }

                    .upload-btn {
                        padding: 10px 20px;
                        font-size: 13px;
                    }
                }

                /* Data Analysis Styles */
                .data-analysis-container {
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .analysis-header {
                    text-align: center;
                    margin-bottom: 32px;
                    padding: 24px;
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border-radius: 12px;
                    border: 1px solid #bae6fd;
                }

                .analysis-header h3 {
                    margin: 0 0 12px 0;
                    font-size: 24px;
                    color: #0c4a6e;
                    font-weight: 600;
                }

                .analysis-header p {
                    margin: 0;
                    color: #0369a1;
                    font-size: 16px;
                }

                .charts-wrapper {
                    min-height: 600px;
                }

                /* Manual Review Styles */
                .manual-review-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .review-header-section {
                    text-align: center;
                    margin-bottom: 32px;
                    padding: 24px;
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border-radius: 12px;
                    border: 1px solid #bae6fd;
                }

                .review-header-section h3 {
                    margin: 0 0 12px 0;
                    font-size: 24px;
                    color: #0c4a6e;
                    font-weight: 600;
                }

                .review-header-section p {
                    margin: 0;
                    color: #0369a1;
                    font-size: 16px;
                }

                .review-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .filter-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .filter-section label {
                    font-weight: 500;
                    color: #374151;
                }

                #review-filter {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                }

                .stats-section {
                    display: flex;
                    gap: 24px;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .stat-label {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 4px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1f2937;
                }

                .review-list-container {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    margin-bottom: 24px;
                }

                .review-list-header {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
                    gap: 16px;
                    padding: 16px 20px;
                    background: #f9fafb;
                    border-bottom: 1px solid #e5e7eb;
                    font-weight: 600;
                    color: #374151;
                    font-size: 14px;
                }

                .review-list {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .review-item {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
                    gap: 16px;
                    padding: 16px 20px;
                    border-bottom: 1px solid #f3f4f6;
                    transition: all 0.2s ease;
                    align-items: center;
                }

                .review-item:hover {
                    background: #f9fafb;
                }

                .review-item:last-child {
                    border-bottom: none;
                }

                .student-info {
                    display: flex;
                    flex-direction: column;
                }

                .student-name {
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 4px;
                }

                .student-id {
                    font-size: 12px;
                    color: #6b7280;
                }

                .question-number {
                    font-weight: 500;
                    color: #374151;
                    text-align: center;
                }

                .ai-score {
                    text-align: center;
                }

                .score-display {
                    font-weight: 600;
                    color: #1f2937;
                    font-size: 16px;
                }

                .confidence {
                    text-align: center;
                }

                .confidence-bar {
                    display: inline-block;
                    width: 60px;
                    height: 8px;
                    background: #e5e7eb;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-right: 8px;
                }

                .confidence-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
                    transition: width 0.3s ease;
                }

                .confidence-text {
                    font-size: 12px;
                    color: #6b7280;
                }

                .status {
                    text-align: center;
                }

                .status-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .status-pending {
                    background: #fef3c7;
                    color: #d97706;
                }

                .status-low-confidence {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .status-needs-review {
                    background: #dbeafe;
                    color: #2563eb;
                }

                .status-completed {
                    background: #d1fae5;
                    color: #059669;
                }

                .actions {
                    text-align: center;
                }

                .review-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .review-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
                }

                .review-actions-bar {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    padding: 20px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }

                .btn-secondary:hover {
                    background: #e5e7eb;
                }

                .empty-state {
                    text-align: center;
                    padding: 48px 24px;
                    color: #6b7280;
                }

                .empty-state svg {
                    width: 64px;
                    height: 64px;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    color: #374151;
                }

                .empty-state p {
                    margin: 0;
                    font-size: 14px;
                }

                @media (max-width: 768px) {
                    .review-list-header,
                    .review-item {
                        grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
                        gap: 12px;
                        font-size: 12px;
                    }

                    .review-list-header .header-item:last-child,
                    .review-item .actions {
                        display: none;
                    }

                    .review-controls {
                        flex-direction: column;
                        gap: 16px;
                        align-items: stretch;
                    }

                    .stats-section {
                        justify-content: center;
                    }

                    .review-actions-bar {
                        flex-direction: column;
                    }

                    .btn {
                        width: 100%;
                    }
                }

                @media (max-width: 480px) {
                    .review-list-header,
                    .review-item {
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                    }

                    .review-list-header .header-item:nth-child(3),
                    .review-list-header .header-item:nth-child(4),
                    .review-item .ai-score,
                    .review-item .confidence {
                        display: none;
                    }
                }

                /* AI Grading Section Styles */
                .ai-grading-section {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    margin-top: 24px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .grading-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .grading-header h3 {
                    margin: 0;
                    font-size: 20px;
                    color: #374151;
                    font-weight: 600;
                }

                .grading-stats {
                    display: flex;
                    gap: 24px;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .stat-label {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1f2937;
                    line-height: 1;
                }

                .ai-score-display-container {
                    margin-bottom: 24px;
                }

                .grading-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                }

                .btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn svg {
                    width: 16px;
                    height: 16px;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }

                .btn-secondary:hover {
                    background: #e5e7eb;
                    transform: translateY(-1px);
                }

                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                }

                /* Grading Results Styles */
                .grading-results {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    margin-top: 24px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .results-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .results-header h3 {
                    margin: 0;
                    font-size: 20px;
                    color: #374151;
                    font-weight: 600;
                }

                .export-results-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .export-results-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
                }

                .result-item {
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 16px;
                    background: #f9fafb;
                    transition: all 0.3s ease;
                }

                .result-item:hover {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .result-item.error {
                    background: #fef2f2;
                    border-color: #fca5a5;
                }

                .result-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .result-header h4 {
                    margin: 0;
                    font-size: 18px;
                    color: #374151;
                    font-weight: 600;
                }

                .score-display {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    min-width: 80px;
                    text-align: center;
                }

                .result-content {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .ocr-section,
                .grading-section {
                    background: white;
                    padding: 16px;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                }

                .ocr-section h5,
                .grading-section h5 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                    color: #374151;
                    font-weight: 600;
                }

                .ocr-text {
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #6b7280;
                    margin-bottom: 8px;
                    max-height: 120px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                }

                .ocr-confidence,
                .confidence {
                    font-size: 13px;
                    color: #6b7280;
                    font-weight: 500;
                }

                .feedback {
                    background: #f0f9ff;
                    padding: 12px;
                    border-radius: 6px;
                    border-left: 4px solid #3b82f6;
                    margin: 12px 0;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #1e40af;
                }

                .grading-details {
                    margin-top: 12px;
                }

                .grading-point {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                }

                .grading-point:last-child {
                    border-bottom: none;
                }

                .point-name {
                    font-weight: 500;
                    color: #374151;
                    flex: 1;
                }

                .point-score {
                    background: #e0e7ff;
                    color: #4338ca;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    margin: 0 8px;
                }

                .point-feedback {
                    font-size: 12px;
                    color: #6b7280;
                    flex: 1;
                    text-align: right;
                }

                .error-content {
                    padding: 16px;
                    background: #fef2f2;
                    border-radius: 6px;
                    border: 1px solid #fca5a5;
                }

                .error-message {
                    color: #dc2626;
                    font-weight: 500;
                    margin-bottom: 8px;
                }

                .file-name {
                    color: #7f1d1d;
                    font-size: 13px;
                }

                .error-icon {
                    font-size: 24px;
                    color: #dc2626;
                }

                @media (max-width: 768px) {
                    .result-content {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .results-header {
                        flex-direction: column;
                        gap: 12px;
                        align-items: flex-start;
                    }

                    .grading-point {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                    }

                    .point-feedback {
                        text-align: left;
                        margin-top: 4px;
                    }
                }
            `
        });
        document.head.appendChild(style);
    }

    setupComponents() {
        // Create header navigation
        this.components.header = new HeaderNavigation();
        const headerContainer = this.element.querySelector('.layout-header');
        headerContainer.appendChild(this.components.header.getElement());

        // Create AI score display
        this.components.aiScoreDisplay = new AIScoreDisplay();
        const scoreDisplayContainer = this.element.querySelector('.ai-score-display-container');
        scoreDisplayContainer.appendChild(this.components.aiScoreDisplay.getElement());

        // Bind header events
        this.components.header.on('tab-changed', data => {
            this.switchTab(data.tab);
        });

        // Bind AI score display events
        this.components.aiScoreDisplay.on('score-confirmed', data => {
            this.handleScoreConfirmed(data);
        });

        this.components.aiScoreDisplay.on('score-adjustment-requested', data => {
            this.handleScoreAdjustment(data);
        });

        this.components.aiScoreDisplay.on('score-rejected', data => {
            this.handleScoreRejected(data);
        });

        // Create charts component for data analysis
        this.components.charts = new Charts();
        const chartsContainer = this.element.querySelector('.charts-wrapper');
        chartsContainer.appendChild(this.components.charts.getElement());

        // Bind charts events
        this.components.charts.on('data-refreshed', data => {
            
        });

        this.components.charts.on('time-range-changed', timeRange => {
            
        });
    }

    bindEvents() {
        // File upload events
        const uploadArea = this.element.querySelector('.upload-area');
        const fileInput = this.element.querySelector('.file-input');
        const uploadBtn = this.element.querySelector('.upload-btn');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadBtn.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files);
        });

        fileInput.addEventListener('change', e => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files);
        });

        // Clear button
        const clearBtn = this.element.querySelector('.clear-btn');
        clearBtn.addEventListener('click', () => {
            this.clearPreview();
        });

        // AI grading buttons
        const aiGradeBtn = this.element.querySelector('.ai-grade-btn');
        const aiTrialBtn = this.element.querySelector('.ai-trial-btn');
        const pauseBtn = this.element.querySelector('.pause-btn');

        aiGradeBtn.addEventListener('click', () => {
            this.startAIGrading();
        });

        aiTrialBtn.addEventListener('click', () => {
            this.startAITrial();
        });

        pauseBtn.addEventListener('click', () => {
            this.pauseAIGrading();
        });

        // Manual review events
        this.setupManualReviewEvents();
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // Hide current tab
        const currentTabContent = this.element.querySelector(
            `.tab-content[data-tab="${this.currentTab}"]`
        );
        if (currentTabContent) {
            removeClass(currentTabContent, 'active');
        }

        // Show new tab
        const newTabContent = this.element.querySelector(`.tab-content[data-tab="${tabName}"]`);
        if (newTabContent) {
            addClass(newTabContent, 'active');
        }

        this.currentTab = tabName;
        this.emit('tab-changed', { tab: tabName });
    }

    handleFileUpload(files) {
        if (!files.length) return;

        // Filter image files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            alert('请选择图片文件');
            return;
        }

        // Show preview section
        const previewSection = this.element.querySelector('.preview-section');
        const uploadSection = this.element.querySelector('.upload-section');
        previewSection.style.display = 'block';

        // Add files to preview
        const previewGrid = this.element.querySelector('.preview-grid');
        imageFiles.forEach(file => {
            this.addFileToPreview(file, previewGrid);
        });

        this.emit('files-uploaded', { files: imageFiles });
    }

    addFileToPreview(file, container) {
        const reader = new FileReader();
        reader.onload = e => {
            const previewItem = createElement('div', {
                className: 'preview-item',
                innerHTML: `
                    <div class="preview-image">
                        <img src="${e.target.result}" alt="${file.name}">
                    </div>
                    <div class="preview-info">
                        <div class="preview-name">${file.name}</div>
                        <div class="preview-size">${this.formatFileSize(file.size)}</div>
                    </div>
                    <button class="preview-remove">×</button>
                `
            });

            // Remove button
            previewItem.querySelector('.preview-remove').addEventListener('click', () => {
                previewItem.remove();
                this.checkEmptyPreview();
            });

            container.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    }

    clearPreview() {
        const previewGrid = this.element.querySelector('.preview-grid');
        previewGrid.innerHTML = '';
        const previewSection = this.element.querySelector('.preview-section');
        previewSection.style.display = 'none';
    }

    checkEmptyPreview() {
        const previewGrid = this.element.querySelector('.preview-grid');
        const previewSection = this.element.querySelector('.preview-section');
        if (previewGrid.children.length === 0) {
            previewSection.style.display = 'none';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    startAIGrading() {
        const previewGrid = this.element.querySelector('.preview-grid');
        const images = previewGrid.querySelectorAll('img');

        if (images.length === 0) {
            alert('请先上传图片文件');
            return;
        }

        // 显示AI评分界面
        const gradingSection = this.element.querySelector('.ai-grading-section');
        gradingSection.style.display = 'block';

        // 显示加载状态
        this.components.aiScoreDisplay.showLoading();

        // 模拟AI评分过程
        this.simulateAIGrading(images);
    }

    startAITrial() {
        const previewGrid = this.element.querySelector('.preview-grid');
        const images = previewGrid.querySelectorAll('img');

        if (images.length === 0) {
            alert('请先上传图片文件');
            return;
        }

        // 显示AI评分界面
        const gradingSection = this.element.querySelector('.ai-grading-section');
        gradingSection.style.display = 'block';

        // 显示加载状态
        this.components.aiScoreDisplay.showLoading();

        // 模拟试读过程（简化版评分）
        this.simulateAITrial(images);
    }

    pauseAIGrading() {
        // 实现暂停逻辑
        const aiGradeBtn = this.element.querySelector('.ai-grade-btn');
        const pauseBtn = this.element.querySelector('.pause-btn');

        aiGradeBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';

        // 这里应该实现真正的暂停逻辑
        
    }

    simulateAIGrading(images) {
        const aiGradeBtn = this.element.querySelector('.ai-grade-btn');
        const pauseBtn = this.element.querySelector('.pause-btn');

        aiGradeBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';

        // 模拟评分过程
        setTimeout(() => {
            // 生成模拟评分数据
            const mockScoreData = {
                totalScore: Math.floor(Math.random() * 40) + 60, // 60-100分
                confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
                scoringTime: Math.floor(Math.random() * 5) + 2, // 2-7秒
                aiModel: 'GPT-4 Vision',
                breakdown: [
                    {
                        name: '内容完整性',
                        description: '答案是否完整回答了题目要求',
                        score: Math.floor(Math.random() * 20) + 15,
                        maxScore: 20
                    },
                    {
                        name: '逻辑性',
                        description: '答案的逻辑结构和条理性',
                        score: Math.floor(Math.random() * 20) + 15,
                        maxScore: 20
                    },
                    {
                        name: '语言表达',
                        description: '语言表达的准确性和流畅性',
                        score: Math.floor(Math.random() * 20) + 15,
                        maxScore: 20
                    },
                    {
                        name: '创新性',
                        description: '答案的创新性和独立思考',
                        score: Math.floor(Math.random() * 20) + 10,
                        maxScore: 20
                    },
                    {
                        name: '格式规范',
                        description: '答案格式和书写规范',
                        score: Math.floor(Math.random() * 20) + 15,
                        maxScore: 20
                    }
                ],
                feedback:
                    '答案整体表现良好，内容完整，逻辑清晰。建议在创新性方面可以进一步加强，增加更多个人见解。',
                tags: ['内容完整', '逻辑清晰', '语言流畅', '创新不足']
            };

            // 显示评分结果
            this.components.aiScoreDisplay.displayScore(mockScoreData);

            // 更新统计信息
            this.updateGradingStats(mockScoreData);

            // 恢复按钮状态
            aiGradeBtn.style.display = 'inline-flex';
            pauseBtn.style.display = 'none';

            // 触发自定义事件
            this.emit('ai-grading-completed', { scoreData: mockScoreData });
        }, 3000); // 3秒后完成评分
    }

    simulateAITrial(images) {
        // 试读模式 - 简化的评分
        setTimeout(() => {
            const mockTrialData = {
                totalScore: Math.floor(Math.random() * 40) + 60,
                confidence: Math.floor(Math.random() * 20) + 60,
                scoringTime: Math.floor(Math.random() * 2) + 1,
                aiModel: 'GPT-4 Vision (Trial)',
                breakdown: [
                    {
                        name: '整体评价',
                        description: '试读模式下的整体评价',
                        score: Math.floor(Math.random() * 40) + 60,
                        maxScore: 100
                    }
                ],
                feedback: '试读完成，这是一个简化版的评分结果。正式评分将提供更详细的分析。',
                tags: ['试读模式']
            };

            this.components.aiScoreDisplay.displayScore(mockTrialData);
            this.updateGradingStats(mockTrialData);
        }, 1500); // 1.5秒后完成试读
    }

    updateGradingStats(scoreData) {
        // 更新今日已阅数量
        const todayGraded = this.element.querySelector('#today-graded');
        const currentCount = parseInt(todayGraded.textContent) || 0;
        todayGraded.textContent = currentCount + 1;

        // 更新平均用时
        const avgTime = this.element.querySelector('#avg-time');
        avgTime.textContent = `${scoreData.scoringTime}秒`;

        // 更新准确率（模拟）
        const accuracy = this.element.querySelector('#accuracy');
        const mockAccuracy = Math.floor(Math.random() * 10) + 90;
        accuracy.textContent = `${mockAccuracy}%`;

        // 更新平均置信度
        const confidence = this.element.querySelector('#confidence');
        confidence.textContent = `${scoreData.confidence}%`;
    }

    handleScoreConfirmed(data) {
        
        alert('评分已确认并保存！');

        // 这里应该实现保存到数据库的逻辑
        this.emit('score-confirmed', data);
    }

    handleScoreAdjustment(data) {
        

        // 这里应该打开分数调整模态框
        // 暂时显示提示
        alert('分数调整功能开发中，请手动修改评分标准');

        this.emit('score-adjustment-requested', data);
    }

    handleScoreRejected(data) {
        

        if (confirm('确定要拒绝此评分结果吗？评分数据将被清除。')) {
            this.components.aiScoreDisplay.clear();

            // 重置统计
            const gradingSection = this.element.querySelector('.ai-grading-section');
            gradingSection.style.display = 'none';

            this.emit('score-rejected', data);
        }
    }

    setupManualReviewEvents() {
        // 筛选功能
        const reviewFilter = this.element.querySelector('#review-filter');
        reviewFilter.addEventListener('change', e => {
            this.filterReviewList(e.target.value);
        });

        // 按钮事件
        const batchReviewBtn = this.element.querySelector('#batch-review-btn');
        const exportReviewsBtn = this.element.querySelector('#export-reviews-btn');
        const viewStatisticsBtn = this.element.querySelector('#view-statistics-btn');

        batchReviewBtn.addEventListener('click', () => {
            this.startBatchReview();
        });

        exportReviewsBtn.addEventListener('click', () => {
            this.exportReviewRecords();
        });

        viewStatisticsBtn.addEventListener('click', () => {
            this.viewReviewStatistics();
        });

        // 初始化复核列表
        this.initReviewList();
    }

    initReviewList() {
        const reviewList = this.element.querySelector('#review-list');

        // 模拟一些复核数据
        const mockReviews = [
            {
                id: 1,
                studentName: '张三',
                studentId: '2021001',
                questionNumber: '1',
                aiScore: 85,
                confidence: 78,
                status: 'pending',
                statusText: '待复核'
            },
            {
                id: 2,
                studentName: '李四',
                studentId: '2021002',
                questionNumber: '2',
                aiScore: 72,
                confidence: 45,
                status: 'low-confidence',
                statusText: '低置信度'
            },
            {
                id: 3,
                studentName: '王五',
                studentId: '2021003',
                questionNumber: '3',
                aiScore: 68,
                confidence: 82,
                status: 'completed',
                statusText: '已复核'
            }
        ];

        this.renderReviewList(mockReviews);
        this.updateReviewStats(mockReviews);
    }

    renderReviewList(reviews) {
        const reviewList = this.element.querySelector('#review-list');

        if (reviews.length === 0) {
            reviewList.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <path d="M32 8C21.4 8 13 16.4 13 27c0 10.2 6.6 18.9 15.7 21.9.7.2 1-.4 1-.9 0-.4 0-1.6-.1-3.1-6.4 1.4-7.8-3.1-7.8-3.1-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-5.1-.6-10.5-2.5-10.5-11.3 0-2.5.9-4.5 2.4-6.1-.3-.6-1-3 .2-6.2 0 0 2-.6 6.3 2.4 1.8-.5 3.8-.8 5.7-.8 1.9 0 3.9.3 5.7.8 4.4-3 6.3-2.4 6.3-2.4 1.2 3.2.5 5.6.2 6.2 1.5 1.6 2.4 3.6 2.4 6.1 0 8.8-5.3 10.8-10.4 11.3.8.7 1.5 2.1 1.5 4.2 0 3.1-.1 5.6-.1 6.3 0 .6.4 1.3 1.6 1.1C44.5 52.2 51 46.5 51 36c0-11-8.9-20-20-20z" fill="currentColor" opacity="0.3"/>
                    </svg>
                    <h3>暂无复核记录</h3>
                    <p>当前没有需要复核的评分记录</p>
                </div>
            `;
            return;
        }

        reviewList.innerHTML = '';

        reviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.innerHTML = `
                <div class="student-info">
                    <div class="student-name">${review.studentName}</div>
                    <div class="student-id">${review.studentId}</div>
                </div>
                <div class="question-number">${review.questionNumber}</div>
                <div class="ai-score">
                    <div class="score-display">${review.aiScore}分</div>
                </div>
                <div class="confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${review.confidence}%"></div>
                    </div>
                    <div class="confidence-text">${review.confidence}%</div>
                </div>
                <div class="status">
                    <span class="status-badge status-${review.status}">${review.statusText}</span>
                </div>
                <div class="actions">
                    <button class="review-btn" data-review-id="${review.id}">复核</button>
                </div>
            `;

            // 添加复核按钮事件
            const reviewBtn = reviewItem.querySelector('.review-btn');
            reviewBtn.addEventListener('click', () => {
                this.openReviewModal(review);
            });

            reviewList.appendChild(reviewItem);
        });
    }

    filterReviewList(filterType) {
        const reviewList = this.element.querySelector('#review-list');
        const allItems = reviewList.querySelectorAll('.review-item');

        allItems.forEach(item => {
            const statusBadge = item.querySelector('.status-badge');
            const status = statusBadge.className.includes('pending')
                ? 'pending'
                : statusBadge.className.includes('low-confidence')
                  ? 'low-confidence'
                  : statusBadge.className.includes('needs-review')
                    ? 'needs-review'
                    : 'completed';

            if (filterType === 'all' || filterType === status) {
                item.style.display = 'grid';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updateReviewStats(reviews) {
        const pendingCount = reviews.filter(
            r => r.status === 'pending' || r.status === 'low-confidence'
        ).length;
        const completedCount = reviews.filter(r => r.status === 'completed').length;

        this.element.querySelector('#pending-count').textContent = pendingCount;
        this.element.querySelector('#completed-count').textContent = completedCount;
    }

    openReviewModal(review) {
        // 这里应该打开详细的复核模态框
        // 暂时显示提示
        alert(
            `打开复核模态框：\n学生：${review.studentName}\n题号：${review.questionNumber}\nAI评分：${review.aiScore}分\n置信度：${review.confidence}%`
        );

        // 这里应该调用实际的复核模态框组件
        this.emit('review-modal-opened', { review });
    }

    startBatchReview() {
        const reviewList = this.element.querySelector('#review-list');
        const pendingItems = reviewList.querySelectorAll(
            '.review-item:not([style*="display: none"])'
        );

        if (pendingItems.length === 0) {
            alert('当前没有需要复核的记录');
            return;
        }

        if (confirm(`确定要开始批量复核吗？共有 ${pendingItems.length} 条记录需要复核。`)) {
            // 这里应该实现批量复核逻辑
            
            this.emit('batch-review-started', { count: pendingItems.length });
        }
    }

    exportReviewRecords() {
        const reviewList = this.element.querySelector('#review-list');
        const items = reviewList.querySelectorAll('.review-item');

        if (items.length === 0) {
            alert('当前没有可导出的记录');
            return;
        }

        // 模拟导出数据
        const exportData = {
            timestamp: new Date().toISOString(),
            records: Array.from(items).map(item => {
                const studentName = item.querySelector('.student-name').textContent;
                const studentId = item.querySelector('.student-id').textContent;
                const questionNumber = item.querySelector('.question-number').textContent;
                const aiScore = item.querySelector('.score-display').textContent;
                const confidence = item.querySelector('.confidence-text').textContent;
                const status = item.querySelector('.status-badge').textContent;

                return {
                    studentName,
                    studentId,
                    questionNumber,
                    aiScore,
                    confidence,
                    status
                };
            })
        };

        // 导出为JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `review-records-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(link.href);

        this.emit('review-records-exported', { count: items.length });
    }

    viewReviewStatistics() {
        // 这里应该显示详细的统计信息
        alert(
            '查看复核统计功能开发中...\n\n当前统计：\n- 待复核：' +
                this.element.querySelector('#pending-count').textContent +
                '\n- 已复核：' +
                this.element.querySelector('#completed-count').textContent
        );

        this.emit('review-statistics-viewed');
    }

    getCurrentTab() {
        return this.currentTab;
    }

    getElement() {
        return this.element;
    }

    getHeader() {
        return this.components.header;
    }

    destroy() {
        if (this.components.header) {
            this.components.header.destroy();
        }
        if (this.element) {
            this.element.remove();
        }
        const style = document.head.querySelector('style[data-main-layout]');
        if (style) {
            style.remove();
        }
    }
}
