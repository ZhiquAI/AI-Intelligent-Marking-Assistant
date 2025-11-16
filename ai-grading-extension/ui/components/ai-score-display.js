/**
 * AI Score Display Component
 * AI评分结果显示组件 - 显示AI评分结果、置信度、评分理由和详细评分维度
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { createElement } from '../../utils/dom-utils.js';

export class AIScoreDisplay extends EventEmitter {
    constructor() {
        super();
        this.scoreData = null;
        this.init();
    }

    init() {
        this.createElement();
        this.addStyles();
    }

    createElement() {
        this.element = createElement('div', {
            className: 'ai-score-display',
            innerHTML: `
                <div class="score-display-header">
                    <h3 class="score-title">AI评分结果</h3>
                    <div class="score-actions">
                        <button class="action-btn export-btn" title="导出结果">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2v8M4 6l4-4 4 4M2 14h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <button class="action-btn expand-btn" title="展开详情">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="score-overview">
                    <div class="total-score">
                        <div class="score-circle">
                            <div class="score-value">--</div>
                            <div class="score-label">总分</div>
                        </div>
                    </div>
                    <div class="score-details">
                        <div class="detail-item confidence">
                            <div class="detail-label">置信度</div>
                            <div class="detail-value">
                                <div class="confidence-bar">
                                    <div class="confidence-fill"></div>
                                </div>
                                <span class="confidence-text">--</span>
                            </div>
                        </div>
                        <div class="detail-item scoring-time">
                            <div class="detail-label">评分用时</div>
                            <div class="detail-value">--</div>
                        </div>
                        <div class="detail-item ai-model">
                            <div class="detail-label">AI模型</div>
                            <div class="detail-value">--</div>
                        </div>
                    </div>
                </div>

                <div class="score-breakdown">
                    <h4 class="breakdown-title">评分维度</h4>
                    <div class="breakdown-list"></div>
                </div>

                <div class="score-feedback">
                    <h4 class="feedback-title">评分建议</h4>
                    <div class="feedback-content">
                        <div class="feedback-placeholder">暂无评分建议</div>
                    </div>
                </div>

                <div class="score-actions-bar">
                    <button class="btn btn-primary confirm-btn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M13 4L6 11l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        确认评分
                    </button>
                    <button class="btn btn-secondary adjust-btn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11 4H5v8h6M8 2v2m0 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        调整分数
                    </button>
                    <button class="btn btn-secondary reject-btn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        拒绝评分
                    </button>
                </div>
            `
        });

        this.bindEvents();
    }

    addStyles() {
        const style = createElement('style', {
            textContent: `
                .ai-score-display {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-bottom: 24px;
                    transition: all 0.3s ease;
                }

                .ai-score-display:hover {
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                }

                .score-display-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .score-title {
                    margin: 0;
                    font-size: 20px;
                    color: #374151;
                    font-weight: 600;
                }

                .score-actions {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border: 1px solid #d1d5db;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #6b7280;
                }

                .action-btn:hover {
                    background: #f3f4f6;
                    color: #374151;
                    transform: translateY(-1px);
                }

                .score-overview {
                    display: grid;
                    grid-template-columns: auto 1fr;
                    gap: 32px;
                    margin-bottom: 24px;
                    padding: 20px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 8px;
                }

                .total-score {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .score-circle {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, #10b981 0deg, #3b82f6 180deg, #8b5cf6 270deg, #ec4899 360deg);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                .score-circle::before {
                    content: '';
                    position: absolute;
                    width: 90px;
                    height: 90px;
                    background: white;
                    border-radius: 50%;
                    z-index: 1;
                }

                .score-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #1f2937;
                    z-index: 2;
                    position: relative;
                }

                .score-label {
                    font-size: 12px;
                    color: #6b7280;
                    z-index: 2;
                    position: relative;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .score-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    align-items: center;
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .detail-label {
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 500;
                }

                .detail-value {
                    font-size: 16px;
                    color: #1f2937;
                    font-weight: 600;
                }

                .confidence .detail-value {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .confidence-bar {
                    flex: 1;
                    height: 8px;
                    background: #e5e7eb;
                    border-radius: 4px;
                    overflow: hidden;
                    position: relative;
                }

                .confidence-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
                    border-radius: 4px;
                    transition: width 0.5s ease;
                    position: relative;
                }

                .confidence-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .confidence-text {
                    font-weight: 600;
                    min-width: 40px;
                    text-align: right;
                }

                .score-breakdown {
                    margin-bottom: 24px;
                }

                .breakdown-title {
                    margin: 0 0 16px 0;
                    font-size: 18px;
                    color: #374151;
                    font-weight: 600;
                }

                .breakdown-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .breakdown-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px;
                    background: #f9fafb;
                    border-radius: 8px;
                    border-left: 4px solid #3b82f6;
                    transition: all 0.2s ease;
                }

                .breakdown-item:hover {
                    background: #f3f4f6;
                    transform: translateX(4px);
                }

                .breakdown-item.high-score {
                    border-left-color: #10b981;
                }

                .breakdown-item.medium-score {
                    border-left-color: #f59e0b;
                }

                .breakdown-item.low-score {
                    border-left-color: #ef4444;
                }

                .dimension-info {
                    flex: 1;
                }

                .dimension-name {
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 4px;
                }

                .dimension-description {
                    font-size: 13px;
                    color: #6b7280;
                    line-height: 1.4;
                }

                .dimension-score {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: 16px;
                }

                .dimension-score-value {
                    background: #e0e7ff;
                    color: #4338ca;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    min-width: 50px;
                    text-align: center;
                }

                .dimension-score-bar {
                    width: 60px;
                    height: 6px;
                    background: #e5e7eb;
                    border-radius: 3px;
                    overflow: hidden;
                }

                .dimension-score-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
                    border-radius: 3px;
                    transition: width 0.3s ease;
                }

                .score-feedback {
                    margin-bottom: 24px;
                }

                .feedback-title {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    color: #374151;
                    font-weight: 600;
                }

                .feedback-content {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    border-radius: 8px;
                    padding: 16px;
                }

                .feedback-placeholder {
                    color: #6b7280;
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                }

                .feedback-text {
                    color: #1e40af;
                    line-height: 1.6;
                    font-size: 14px;
                }

                .feedback-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 12px;
                }

                .feedback-tag {
                    background: #dbeafe;
                    color: #1d4ed8;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .score-actions-bar {
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
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn svg {
                    width: 16px;
                    height: 16px;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }

                .btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #d1d5db;
                }

                .btn-secondary:hover {
                    background: #e5e7eb;
                }

                /* 状态样式 */
                .ai-score-display.loading .score-value,
                .ai-score-display.loading .confidence-text {
                    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    color: transparent;
                    border-radius: 4px;
                }

                .ai-score-display.error {
                    border: 1px solid #fca5a5;
                    background: #fef2f2;
                }

                .ai-score-display.error .score-title {
                    color: #dc2626;
                }

                .error-message {
                    background: #fee2e2;
                    color: #dc2626;
                    padding: 12px;
                    border-radius: 6px;
                    border: 1px solid #fca5a5;
                    margin-bottom: 16px;
                    font-size: 14px;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* 响应式设计 */
                @media (max-width: 768px) {
                    .score-overview {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }

                    .score-details {
                        grid-template-columns: 1fr;
                    }

                    .score-actions-bar {
                        flex-direction: column;
                    }

                    .btn {
                        width: 100%;
                        justify-content: center;
                    }

                    .breakdown-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }

                    .dimension-score {
                        margin-left: 0;
                        width: 100%;
                        justify-content: space-between;
                    }
                }

                @media (max-width: 480px) {
                    .ai-score-display {
                        padding: 16px;
                    }

                    .score-circle {
                        width: 100px;
                        height: 100px;
                    }

                    .score-circle::before {
                        width: 70px;
                        height: 70px;
                    }

                    .score-value {
                        font-size: 28px;
                    }

                    .score-display-header {
                        flex-direction: column;
                        gap: 12px;
                        align-items: flex-start;
                    }
                }
            `
        });
        document.head.appendChild(style);
    }

    bindEvents() {
        // 确认评分按钮
        this.element.querySelector('.confirm-btn').addEventListener('click', () => {
            if (this.scoreData) {
                this.emit('score-confirmed', { scoreData: this.scoreData });
            }
        });

        // 调整分数按钮
        this.element.querySelector('.adjust-btn').addEventListener('click', () => {
            if (this.scoreData) {
                this.emit('score-adjustment-requested', { scoreData: this.scoreData });
            }
        });

        // 拒绝评分按钮
        this.element.querySelector('.reject-btn').addEventListener('click', () => {
            if (this.scoreData) {
                this.emit('score-rejected', { scoreData: this.scoreData });
            }
        });

        // 导出按钮
        this.element.querySelector('.export-btn').addEventListener('click', () => {
            if (this.scoreData) {
                this.exportScoreData();
            }
        });

        // 展开/收起详情
        this.element.querySelector('.expand-btn').addEventListener('click', (e) => {
            const breakdown = this.element.querySelector('.score-breakdown');
            const isExpanded = breakdown.style.display !== 'none';

            if (isExpanded) {
                breakdown.style.display = 'none';
                this.element.querySelector('.score-feedback').style.display = 'none';
                e.target.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else {
                breakdown.style.display = 'block';
                this.element.querySelector('.score-feedback').style.display = 'block';
                e.target.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            }
        });
    }

    displayScore(scoreData) {
        this.scoreData = scoreData;

        // 显示总分
        this.element.querySelector('.score-value').textContent = scoreData.totalScore;

        // 显示置信度
        const confidenceFill = this.element.querySelector('.confidence-fill');
        const confidenceText = this.element.querySelector('.confidence-text');
        confidenceFill.style.width = `${scoreData.confidence}%`;
        confidenceText.textContent = `${scoreData.confidence}%`;

        // 设置置信度颜色
        if (scoreData.confidence >= 80) {
            confidenceFill.style.background = '#10b981';
        } else if (scoreData.confidence >= 60) {
            confidenceFill.style.background = '#f59e0b';
        } else {
            confidenceFill.style.background = '#ef4444';
        }

        // 显示评分用时
        this.element.querySelector('.scoring-time .detail-value').textContent =
            scoreData.scoringTime ? `${scoreData.scoringTime}秒` : '--';

        // 显示AI模型
        this.element.querySelector('.ai-model .detail-value').textContent =
            scoreData.aiModel || '--';

        // 显示评分维度
        this.displayBreakdown(scoreData.breakdown || []);

        // 显示评分建议
        this.displayFeedback(scoreData.feedback || '', scoreData.tags || []);

        // 添加动画效果
        this.element.classList.add('show');

        // 显示组件
        this.element.style.display = 'block';
    }

    displayBreakdown(breakdown) {
        const breakdownList = this.element.querySelector('.breakdown-list');
        breakdownList.innerHTML = '';

        if (breakdown.length === 0) {
            breakdownList.innerHTML = '<div class="no-breakdown">暂无评分维度信息</div>';
            return;
        }

        breakdown.forEach(item => {
            const breakdownItem = createElement('div', {
                className: 'breakdown-item',
                innerHTML: `
                    <div class="dimension-info">
                        <div class="dimension-name">${item.name}</div>
                        <div class="dimension-description">${item.description}</div>
                    </div>
                    <div class="dimension-score">
                        <div class="dimension-score-value">${item.score}</div>
                        <div class="dimension-score-bar">
                            <div class="dimension-score-fill" style="width: ${this.getScorePercentage(item.score, item.maxScore)}%"></div>
                        </div>
                    </div>
                `
            });

            // 根据分数设置样式
            const percentage = this.getScorePercentage(item.score, item.maxScore);
            if (percentage >= 80) {
                breakdownItem.classList.add('high-score');
            } else if (percentage >= 60) {
                breakdownItem.classList.add('medium-score');
            } else {
                breakdownItem.classList.add('low-score');
            }

            breakdownList.appendChild(breakdownItem);
        });
    }

    displayFeedback(feedback, tags) {
        const feedbackContent = this.element.querySelector('.feedback-content');

        if (!feedback && tags.length === 0) {
            feedbackContent.innerHTML = '<div class="feedback-placeholder">暂无评分建议</div>';
            return;
        }

        let feedbackHTML = '';
        if (feedback) {
            feedbackHTML += `<div class="feedback-text">${feedback}</div>`;
        }

        if (tags.length > 0) {
            feedbackHTML += '<div class="feedback-tags">';
            tags.forEach(tag => {
                feedbackHTML += `<span class="feedback-tag">${tag}</span>`;
            });
            feedbackHTML += '</div>';
        }

        feedbackContent.innerHTML = feedbackHTML;
    }

    getScorePercentage(score, maxScore) {
        if (!maxScore) maxScore = 100;
        return Math.round((score / maxScore) * 100);
    }

    showLoading() {
        this.element.classList.add('loading');
        this.element.style.display = 'block';
    }

    hideLoading() {
        this.element.classList.remove('loading');
    }

    showError(message) {
        this.element.innerHTML = `
            <div class="error-message">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="error-icon">⚠️</span>
                    <span>${message}</span>
                </div>
            </div>
        ` + this.element.innerHTML;
        this.element.classList.add('error');
        this.element.style.display = 'block';
    }

    hideError() {
        this.element.classList.remove('error');
        const errorMessage = this.element.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    exportScoreData() {
        if (!this.scoreData) return;

        const exportData = {
            timestamp: new Date().toISOString(),
            scoreData: this.scoreData
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = createElement('a', {
            href: URL.createObjectURL(dataBlob),
            download: `ai-score-${Date.now()}.json`
        });

        link.click();
        URL.revokeObjectURL(link.href);

        this.emit('score-exported', { scoreData: this.scoreData });
    }

    clear() {
        this.scoreData = null;
        this.element.querySelector('.score-value').textContent = '--';
        this.element.querySelector('.confidence-fill').style.width = '0%';
        this.element.querySelector('.confidence-text').textContent = '--';
        this.element.querySelector('.scoring-time .detail-value').textContent = '--';
        this.element.querySelector('.ai-model .detail-value').textContent = '--';
        this.element.querySelector('.breakdown-list').innerHTML = '<div class="no-breakdown">暂无评分维度信息</div>';
        this.element.querySelector('.feedback-content').innerHTML = '<div class="feedback-placeholder">暂无评分建议</div>';
        this.hideError();
        this.element.style.display = 'none';
    }

    getElement() {
        return this.element;
    }

    destroy() {
        if (this.element) {
            this.element.remove();
        }
        const style = document.head.querySelector('style[data-ai-score-display]');
        if (style) {
            style.remove();
        }
    }
}
