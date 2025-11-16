/**
 * Manual Review Panel
 * 人工复核面板 - 提供人工复核和评分调整功能
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { createElement, addClass, removeClass } from '../../utils/dom-utils.js';

export class ManualReviewPanel extends EventEmitter {
    constructor() {
        super();
        this.currentReview = null;
        this.reviewHistory = [];
        this.isVisible = false;
        this.originalScore = null;
        this.adjustedScore = null;
        this.reviewReason = '';
        
    }

    /**
     * 创建复核面板
     */
    createPanel() {
        this.element = createElement('div', {
            className: 'manual-review-panel',
            styles: {
                display: 'none',
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: '1000001',
                backdropFilter: 'blur(4px)'
            },
            innerHTML: `
                <div class="review-modal">
                    <div class="review-header">
                        <h3>人工复核</h3>
                        <button class="close-btn">×</button>
                    </div>

                    <div class="review-content">
                        <div class="student-info">
                            <h4>学生答案信息</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="label">学生姓名：</span>
                                    <span class="value" id="student-name">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">题号：</span>
                                    <span class="value" id="question-number">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">原始分数：</span>
                                    <span class="value" id="original-score">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="label">AI置信度：</span>
                                    <span class="value" id="ai-confidence">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="answer-comparison">
                            <h4>答案对比</h4>
                            <div class="comparison-container">
                                <div class="answer-section">
                                    <h5>标准答案</h5>
                                    <div class="standard-answer" id="standard-answer">--</div>
                                </div>
                                <div class="answer-section">
                                    <h5>学生答案</h5>
                                    <div class="student-answer" id="student-answer">--</div>
                                </div>
                            </div>
                        </div>

                        <div class="ai-grading-details">
                            <h4>AI评分详情</h4>
                            <div class="grading-breakdown" id="grading-breakdown">
                                <!-- 动态生成评分细节 -->
                            </div>
                            <div class="ai-feedback" id="ai-feedback">--</div>
                        </div>

                        <div class="manual-adjustment">
                            <h4>人工调整</h4>
                            <div class="adjustment-controls">
                                <div class="score-adjustment">
                                    <label>调整后分数：</label>
                                    <input type="number" id="adjusted-score" min="0" max="100" step="0.5">
                                    <span class="score-range">/<span>
                                    <span id="max-score">100</span>分
                                </div>
                                <div class="adjustment-reason">
                                    <label>调整原因：</label>
                                    <select id="adjustment-reason">
                                        <option value="">请选择调整原因</option>
                                        <option value="incorrect_grading">AI评分不准确</option>
                                        <option value="partial_credit">应给予部分分数</option>
                                        <option value="alternative_method">使用了不同的解题方法</option>
                                        <option value="calculation_error">计算错误但思路正确</option>
                                        <option value="notation_issue">符号或格式问题</option>
                                        <option value="other">其他原因</option>
                                    </select>
                                </div>
                                <div class="detailed-reason">
                                    <label>详细说明：</label>
                                    <textarea id="detailed-reason" placeholder="请详细说明调整原因..."></textarea>
                                </div>
                            </div>
                        </div>

                        <div class="review-actions">
                            <button class="btn btn-secondary" id="cancel-review">取消</button>
                            <button class="btn btn-primary" id="save-review">保存复核结果</button>
                            <button class="btn btn-success" id="approve-original">确认原评分</button>
                        </div>
                    </div>
                </div>
            `
        });

        this.addStyles();
        this.bindEvents();
        return this.element;
    }

    /**
     * 添加样式
     */
    addStyles() {
        const style = createElement('style', {
            textContent: `
                .manual-review-panel {
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .review-modal {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }

                .review-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .review-header h3 {
                    margin: 0;
                    font-size: 20px;
                    color: #374151;
                    font-weight: 600;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .review-content {
                    padding: 24px;
                }

                .student-info,
                .answer-comparison,
                .ai-grading-details,
                .manual-adjustment {
                    margin-bottom: 24px;
                }

                .student-info h4,
                .answer-comparison h4,
                .ai-grading-details h4,
                .manual-adjustment h4 {
                    margin: 0 0 16px 0;
                    font-size: 18px;
                    color: #374151;
                    font-weight: 600;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }

                .info-item {
                    display: flex;
                    align-items: center;
                }

                .info-item .label {
                    font-weight: 500;
                    color: #6b7280;
                    margin-right: 8px;
                }

                .info-item .value {
                    color: #374151;
                    font-weight: 600;
                }

                .comparison-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .answer-section {
                    background: #f9fafb;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }

                .answer-section h5 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                    color: #374151;
                    font-weight: 600;
                }

                .standard-answer,
                .student-answer {
                    background: white;
                    padding: 12px;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    max-height: 200px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                }

                .grading-breakdown {
                    background: #f0f9ff;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #bfdbfe;
                    margin-bottom: 12px;
                }

                .grading-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #e0e7ff;
                }

                .grading-item:last-child {
                    border-bottom: none;
                }

                .grading-criterion {
                    font-weight: 500;
                    color: #1e40af;
                }

                .grading-score {
                    background: #3b82f6;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .ai-feedback {
                    background: white;
                    padding: 16px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #374151;
                }

                .adjustment-controls {
                    background: #f9fafb;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }

                .score-adjustment,
                .adjustment-reason,
                .detailed-reason {
                    margin-bottom: 16px;
                }

                .score-adjustment label,
                .adjustment-reason label,
                .detailed-reason label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #374151;
                }

                .score-adjustment {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                #adjusted-score {
                    width: 80px;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 16px;
                    text-align: center;
                }

                #adjustment-reason {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                }

                #detailed-reason {
                    width: 100%;
                    min-height: 80px;
                    padding: 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    font-family: inherit;
                    resize: vertical;
                }

                #adjusted-score:focus,
                #adjustment-reason:focus,
                #detailed-reason:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .review-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    padding-top: 20px;
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

                .btn-success {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                }

                .btn-success:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }

                @media (max-width: 768px) {
                    .review-modal {
                        width: 95%;
                        max-height: 95vh;
                    }

                    .info-grid {
                        grid-template-columns: 1fr;
                    }

                    .comparison-container {
                        grid-template-columns: 1fr;
                    }

                    .review-actions {
                        flex-direction: column;
                    }

                    .btn {
                        width: 100%;
                    }
                }
            `
        });
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮
        const closeBtn = this.element.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.hide());

        // 取消按钮
        const cancelBtn = this.element.querySelector('#cancel-review');
        cancelBtn.addEventListener('click', () => this.hide());

        // 保存复核结果
        const saveBtn = this.element.querySelector('#save-review');
        saveBtn.addEventListener('click', () => this.saveReview());

        // 确认原评分
        const approveBtn = this.element.querySelector('#approve-original');
        approveBtn.addEventListener('click', () => this.approveOriginal());

        // 分数输入验证
        const scoreInput = this.element.querySelector('#adjusted-score');
        scoreInput.addEventListener('input', (e) => this.validateScoreInput(e));

        // 原因选择
        const reasonSelect = this.element.querySelector('#adjustment-reason');
        reasonSelect.addEventListener('change', (e) => this.handleReasonChange(e));

        // 点击背景关闭
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * 显示复核面板
     */
    show(reviewData) {
        this.currentReview = reviewData;
        this.populateReviewData(reviewData);
        this.isVisible = true;
        this.element.style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.emit('panel-shown', reviewData);
    }

    /**
     * 隐藏复核面板
     */
    hide() {
        this.isVisible = false;
        this.element.style.display = 'none';
        document.body.style.overflow = '';
        this.resetForm();
        this.emit('panel-hidden');
    }

    /**
     * 填充复核数据
     */
    populateReviewData(data) {
        // 基本信息
        this.element.querySelector('#student-name').textContent = data.studentName || '未知学生';
        this.element.querySelector('#question-number').textContent = data.questionNumber || '--';
        this.element.querySelector('#original-score').textContent = `${data.originalScore}/${data.totalScore}`;
        this.element.querySelector('#ai-confidence').textContent = `${(data.aiConfidence * 100).toFixed(1)}%`;

        // 答案对比
        this.element.querySelector('#standard-answer').textContent = data.standardAnswer || '--';
        this.element.querySelector('#student-answer').textContent = data.studentAnswer || '--';

        // AI评分详情
        this.populateGradingDetails(data.gradingDetails);

        // AI反馈
        this.element.querySelector('#ai-feedback').textContent = data.aiFeedback || '--';

        // 设置最大分数
        this.element.querySelector('#max-score').textContent = data.totalScore || 100;
        this.element.querySelector('#adjusted-score').max = data.totalScore || 100;

        // 记住原始分数
        this.originalScore = data.originalScore;
        this.adjustedScore = data.originalScore;

        // 设置当前分数
        this.element.querySelector('#adjusted-score').value = data.originalScore;
    }

    /**
     * 填充评分详情
     */
    populateGradingDetails(details) {
        const breakdown = this.element.querySelector('#grading-breakdown');
        breakdown.innerHTML = '';

        if (details && details.length > 0) {
            details.forEach(detail => {
                const item = createElement('div', {
                    className: 'grading-item',
                    innerHTML: `
                        <span class="grading-criterion">${detail.criterion}</span>
                        <span class="grading-score">${detail.score}分</span>
                    `
                });
                breakdown.appendChild(item);
            });
        } else {
            breakdown.innerHTML = '<div class="no-details">暂无评分详情</div>';
        }
    }

    /**
     * 验证分数输入
     */
    validateScoreInput(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        const maxScore = parseFloat(input.max);

        if (isNaN(value) || value < 0) {
            input.value = 0;
        } else if (value > maxScore) {
            input.value = maxScore;
        }

        this.adjustedScore = parseFloat(input.value);
    }

    /**
     * 处理原因变更
     */
    handleReasonChange(event) {
        const reason = event.target.value;
        const detailedReasonDiv = this.element.querySelector('.detailed-reason');

        if (reason === 'other') {
            detailedReasonDiv.style.display = 'block';
        } else {
            detailedReasonDiv.style.display = 'none';
        }
    }

    /**
     * 保存复核结果
     */
    async saveReview() {
        try {
            const adjustedScore = parseFloat(this.element.querySelector('#adjusted-score').value);
            const reason = this.element.querySelector('#adjustment-reason').value;
            const detailedReason = this.element.querySelector('#detailed-reason').value;

            // 验证输入
            if (!reason) {
                alert('请选择调整原因');
                return;
            }

            if (adjustedScore === this.originalScore && !detailedReason) {
                alert('分数未调整，请输入详细说明');
                return;
            }

            const reviewResult = {
                originalScore: this.originalScore,
                adjustedScore: adjustedScore,
                adjustmentReason: reason,
                detailedReason: detailedReason,
                timestamp: Date.now(),
                reviewer: '当前用户', // 应该从用户系统获取
                reviewId: this.generateReviewId(),
                status: adjustedScore !== this.originalScore ? 'adjusted' : 'confirmed'
            };

            // 添加到历史记录
            this.addToHistory({
                ...this.currentReview,
                ...reviewResult
            });

            this.emit('review-completed', reviewResult);
            this.hide();

            // 显示成功消息
            if (adjustedScore !== this.originalScore) {
                alert(`复核完成：分数已从 ${this.originalScore} 调整为 ${adjustedScore}`);
            } else {
                alert('复核完成：确认原评分');
            }

        } catch (error) {
            // console.error('保存复核结果失败:', error);
            alert('保存失败: ' + error.message);
        }
    }

    /**
     * 确认原评分
     */
    async approveOriginal() {
        try {
            const reviewResult = {
                originalScore: this.originalScore,
                adjustedScore: this.originalScore,
                adjustmentReason: 'confirmed',
                detailedReason: '确认原评分准确无误',
                timestamp: Date.now(),
                reviewer: '当前用户',
                reviewId: this.generateReviewId(),
                status: 'confirmed'
            };

            this.addToHistory({
                ...this.currentReview,
                ...reviewResult
            });

            this.emit('review-completed', reviewResult);
            this.hide();

            alert('已确认原评分');

        } catch (error) {
            // console.error('确认原评分失败:', error);
            alert('操作失败: ' + error.message);
        }
    }

    /**
     * 添加到历史记录
     */
    addToHistory(reviewRecord) {
        this.reviewHistory.unshift({
            ...reviewRecord,
            id: this.generateReviewId()
        });

        // 限制历史记录数量
        if (this.reviewHistory.length > 100) {
            this.reviewHistory = this.reviewHistory.slice(0, 100);
        }

        this.emit('history-updated', this.reviewHistory);
    }

    /**
     * 获取历史记录
     */
    getHistory(filters = {}) {
        let filtered = [...this.reviewHistory];

        if (filters.studentName) {
            filtered = filtered.filter(r => r.studentName === filters.studentName);
        }

        if (filters.questionNumber) {
            filtered = filtered.filter(r => r.questionNumber === filters.questionNumber);
        }

        if (filters.status) {
            filtered = filtered.filter(r => r.status === filters.status);
        }

        if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            filtered = filtered.filter(r => r.timestamp >= start && r.timestamp <= end);
        }

        return filtered;
    }

    /**
     * 生成复核ID
     */
    generateReviewId() {
        return 'review_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 重置表单
     */
    resetForm() {
        this.element.querySelector('#adjusted-score').value = '';
        this.element.querySelector('#adjustment-reason').value = '';
        this.element.querySelector('#detailed-reason').value = '';
        this.element.querySelector('.detailed-reason').style.display = 'none';
        this.currentReview = null;
        this.originalScore = null;
        this.adjustedScore = null;
        this.reviewReason = '';
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const total = this.reviewHistory.length;
        const adjusted = this.reviewHistory.filter(r => r.status === 'adjusted').length;
        const confirmed = this.reviewHistory.filter(r => r.status === 'confirmed').length;

        const avgAdjustment = this.reviewHistory
            .filter(r => r.status === 'adjusted')
            .reduce((sum, r) => sum + Math.abs(r.adjustedScore - r.originalScore), 0) / adjusted || 0;

        return {
            totalReviews: total,
            adjustedReviews: adjusted,
            confirmedReviews: confirmed,
            averageAdjustment: avgAdjustment,
            adjustmentRate: total > 0 ? (adjusted / total * 100).toFixed(1) : 0
        };
    }

    /**
     * 销毁面板
     */
    destroy() {
        this.hide();
        if (this.element) {
            this.element.remove();
        }
        const style = document.head.querySelector('style[data-manual-review]');
        if (style) {
            style.remove();
        }
        this.removeAllListeners();
        
    }

    /**
     * 获取元素
     */
    getElement() {
        return this.element;
    }
}

// 创建全局实例
export const manualReviewPanel = new ManualReviewPanel();
