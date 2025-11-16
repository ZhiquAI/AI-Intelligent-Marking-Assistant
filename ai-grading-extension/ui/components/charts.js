/**
 * Charts Component
 * 图表组件 - 使用Chart.js实现数据可视化
 */

import { EventEmitter } from '../../utils/event-emitter.js';
import { createElement } from '../../utils/dom-utils.js';

export class Charts extends EventEmitter {
    constructor() {
        super();
        this.charts = {};
        this.chartData = {};
        this.init();
    }

    init() {
        this.createElement();
        this.loadChartJS();
    }

    createElement() {
        this.element = createElement('div', {
            className: 'charts-container',
            innerHTML: `
                <div class="charts-header">
                    <h3 class="charts-title">数据分析</h3>
                    <div class="charts-controls">
                        <select class="time-range-select">
                            <option value="today">今日</option>
                            <option value="week">本周</option>
                            <option value="month">本月</option>
                            <option value="year">本年</option>
                        </select>
                        <button class="refresh-btn" title="刷新数据">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 8a6 6 0 0110.89-3.476l1.817 1.816a1 1 0 01-1.414 1.414l-1.82-1.82A4 4 0 003 8a4 4 0 004 4 4 4 0 004-4H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-item">
                        <div class="chart-header">
                            <h4>评分分布</h4>
                            <div class="chart-info" title="显示各分数段的学生人数分布">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                                    <path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="chart-canvas-container">
                            <canvas id="score-distribution-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-item">
                        <div class="chart-header">
                            <h4>置信度趋势</h4>
                            <div class="chart-info" title="显示AI评分的置信度变化趋势">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                                    <path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="chart-canvas-container">
                            <canvas id="confidence-trend-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-item">
                        <div class="chart-header">
                            <h4>复核统计</h4>
                            <div class="chart-info" title="显示人工复核的统计数据">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                                    <path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="chart-canvas-container">
                            <canvas id="review-stats-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-item">
                        <div class="chart-header">
                            <h4>AI准确率</h4>
                            <div class="chart-info" title="显示AI评分的准确性分析">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                                    <path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="chart-canvas-container">
                            <canvas id="accuracy-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-item full-width">
                        <div class="chart-header">
                            <h4>评分趋势</h4>
                            <div class="chart-info" title="显示评分的时间趋势变化">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                                    <path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="chart-canvas-container">
                            <canvas id="grading-trend-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="charts-summary">
                    <div class="summary-item">
                        <div class="summary-value" id="total-graded">0</div>
                        <div class="summary-label">总阅卷数</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value" id="avg-score">0</div>
                        <div class="summary-label">平均分</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value" id="avg-confidence">0%</div>
                        <div class="summary-label">平均置信度</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value" id="review-rate">0%</div>
                        <div class="summary-label">复核率</div>
                    </div>
                </div>
            `
        });

        this.addStyles();
        this.bindEvents();
    }

    addStyles() {
        const style = createElement('style', {
            textContent: `
                .charts-container {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .charts-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .charts-title {
                    margin: 0;
                    font-size: 20px;
                    color: #374151;
                    font-weight: 600;
                }

                .charts-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .time-range-select {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                }

                .refresh-btn {
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

                .refresh-btn:hover {
                    background: #f3f4f6;
                    color: #374151;
                    transform: rotate(180deg);
                }

                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .chart-item {
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 20px;
                    border: 1px solid #e5e7eb;
                }

                .chart-item.full-width {
                    grid-column: 1 / -1;
                }

                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .chart-header h4 {
                    margin: 0;
                    font-size: 16px;
                    color: #374151;
                    font-weight: 600;
                }

                .chart-info {
                    cursor: pointer;
                    color: #6b7280;
                    transition: color 0.2s ease;
                }

                .chart-info:hover {
                    color: #374151;
                }

                .chart-canvas-container {
                    position: relative;
                    height: 250px;
                }

                .chart-canvas-container canvas {
                    max-width: 100%;
                    height: auto;
                }

                .charts-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    padding: 24px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }

                .summary-item {
                    text-align: center;
                    padding: 16px;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                .summary-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 8px;
                    line-height: 1;
                }

                .summary-label {
                    font-size: 14px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* 加载状态 */
                .charts-container.loading .chart-canvas-container {
                    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                    border-radius: 4px;
                }

                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* 空状态 */
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

                /* 工具提示 */
                .tooltip {
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 1000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s ease;
                    pointer-events: none;
                }

                .tooltip.show {
                    opacity: 1;
                    visibility: visible;
                }

                .tooltip::before {
                    content: '';
                    position: absolute;
                    top: -4px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                    border-bottom: 4px solid rgba(0, 0, 0, 0.9);
                }

                /* 响应式设计 */
                @media (max-width: 768px) {
                    .charts-container {
                        padding: 16px;
                    }

                    .charts-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .chart-item {
                        padding: 16px;
                    }

                    .chart-canvas-container {
                        height: 200px;
                    }

                    .charts-summary {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                        padding: 16px;
                    }

                    .summary-value {
                        font-size: 24px;
                    }

                    .charts-header {
                        flex-direction: column;
                        gap: 12px;
                        align-items: flex-start;
                    }
                }

                @media (max-width: 480px) {
                    .charts-summary {
                        grid-template-columns: 1fr;
                    }

                    .summary-item {
                        padding: 12px;
                    }

                    .summary-value {
                        font-size: 20px;
                    }
                }
            `
        });
        document.head.appendChild(style);
    }

    bindEvents() {
        // 刷新按钮
        const refreshBtn = this.element.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });

        // 时间范围选择
        const timeRangeSelect = this.element.querySelector('.time-range-select');
        timeRangeSelect.addEventListener('change', (e) => {
            this.updateTimeRange(e.target.value);
        });

        // 工具提示
        this.element.addEventListener('mouseenter', (e) => {
            const infoIcon = e.target.closest('.chart-info');
            if (infoIcon) {
                this.showTooltip(infoIcon);
            }
        }, true);

        this.element.addEventListener('mouseleave', (e) => {
            const infoIcon = e.target.closest('.chart-info');
            if (infoIcon) {
                this.hideTooltip();
            }
        }, true);
    }

    loadChartJS() {
        // 动态加载Chart.js
        return new Promise((resolve, reject) => {
            if (window.Chart) {
                resolve(window.Chart);
                return;
            }

            const script = createElement('script', {
                src: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
                onload: () => resolve(window.Chart),
                onerror: reject
            });
            document.head.appendChild(script);
        });
    }

    async initCharts() {
        const Chart = await this.loadChartJS();

        // 评分分布图
        this.createScoreDistributionChart(Chart);

        // 置信度趋势图
        this.createConfidenceTrendChart(Chart);

        // 复核统计图
        this.createReviewStatsChart(Chart);

        // AI准确率图
        this.createAccuracyChart(Chart);

        // 评分趋势图
        this.createGradingTrendChart(Chart);

        // 更新汇总数据
        this.updateSummaryData();
    }

    createScoreDistributionChart(Chart) {
        const ctx = this.element.querySelector('#score-distribution-chart').getContext('2d');

        this.charts.scoreDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-59', '60-69', '70-79', '80-89', '90-100'],
                datasets: [{
                    label: '学生人数',
                    data: [5, 15, 35, 30, 15],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(139, 92, 246, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `学生人数: ${context.parsed.y}人`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 10
                        }
                    }
                }
            }
        });
    }

    createConfidenceTrendChart(Chart) {
        const ctx = this.element.querySelector('#confidence-trend-chart').getContext('2d');

        this.charts.confidenceTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
                datasets: [{
                    label: '平均置信度',
                    data: [75, 78, 82, 85, 83, 87],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 70,
                        max: 90,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    createReviewStatsChart(Chart) {
        const ctx = this.element.querySelector('#review-stats-chart').getContext('2d');

        this.charts.reviewStats = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['已复核', '待复核', '低置信度'],
                datasets: [{
                    data: [65, 25, 10],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createAccuracyChart(Chart) {
        const ctx = this.element.querySelector('#accuracy-chart').getContext('2d');

        this.charts.accuracy = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['语文', '数学', '英语', '物理', '化学', '生物'],
                datasets: [{
                    label: 'AI准确率',
                    data: [92, 88, 85, 90, 87, 89],
                    borderColor: 'rgba(139, 92, 246, 1)',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    pointBackgroundColor: 'rgba(139, 92, 246, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }

    createGradingTrendChart(Chart) {
        const ctx = this.element.querySelector('#grading-trend-chart').getContext('2d');

        this.charts.gradingTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周'],
                datasets: [
                    {
                        label: '平均分',
                        data: [75, 78, 82, 80, 85, 83, 87, 89],
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: '最高分',
                        data: [95, 98, 96, 99, 97, 100, 98, 99],
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: '最低分',
                        data: [45, 52, 58, 55, 60, 57, 62, 65],
                        borderColor: 'rgba(239, 68, 68, 1)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 40,
                        max: 100
                    }
                }
            }
        });
    }

    updateSummaryData() {
        // 模拟汇总数据
        this.element.querySelector('#total-graded').textContent = '1,234';
        this.element.querySelector('#avg-score').textContent = '82.5';
        this.element.querySelector('#avg-confidence').textContent = '84.2%';
        this.element.querySelector('#review-rate').textContent = '15.3%';
    }

    updateData(data) {
        this.chartData = data;

        // 更新各个图表的数据
        if (data.scoreDistribution) {
            this.charts.scoreDistribution.data.datasets[0].data = data.scoreDistribution;
            this.charts.scoreDistribution.update();
        }

        if (data.confidenceTrend) {
            this.charts.confidenceTrend.data.datasets[0].data = data.confidenceTrend;
            this.charts.confidenceTrend.update();
        }

        if (data.reviewStats) {
            this.charts.reviewStats.data.datasets[0].data = data.reviewStats;
            this.charts.reviewStats.update();
        }

        if (data.accuracy) {
            this.charts.accuracy.data.datasets[0].data = data.accuracy;
            this.charts.accuracy.update();
        }

        if (data.gradingTrend) {
            this.charts.gradingTrend.data.datasets.forEach((dataset, index) => {
                if (data.gradingTrend[index]) {
                    dataset.data = data.gradingTrend[index];
                }
            });
            this.charts.gradingTrend.update();
        }

        // 更新汇总数据
        if (data.summary) {
            this.element.querySelector('#total-graded').textContent = data.summary.totalGraded;
            this.element.querySelector('#avg-score').textContent = data.summary.avgScore;
            this.element.querySelector('#avg-confidence').textContent = data.summary.avgConfidence;
            this.element.querySelector('#review-rate').textContent = data.summary.reviewRate;
        }
    }

    refreshData() {
        this.element.classList.add('loading');

        // 模拟数据刷新
        setTimeout(() => {
            // 生成新的模拟数据
            const newData = {
                scoreDistribution: [
                    Math.floor(Math.random() * 10) + 3,
                    Math.floor(Math.random() * 20) + 10,
                    Math.floor(Math.random() * 30) + 20,
                    Math.floor(Math.random() * 25) + 15,
                    Math.floor(Math.random() * 20) + 10
                ],
                confidenceTrend: [
                    Math.floor(Math.random() * 15) + 75,
                    Math.floor(Math.random() * 15) + 75,
                    Math.floor(Math.random() * 15) + 75,
                    Math.floor(Math.random() * 15) + 75,
                    Math.floor(Math.random() * 15) + 75,
                    Math.floor(Math.random() * 15) + 75
                ],
                reviewStats: [
                    Math.floor(Math.random() * 20) + 60,
                    Math.floor(Math.random() * 15) + 20,
                    Math.floor(Math.random() * 10) + 5
                ],
                accuracy: [
                    Math.floor(Math.random() * 10) + 85,
                    Math.floor(Math.random() * 10) + 85,
                    Math.floor(Math.random() * 10) + 85,
                    Math.floor(Math.random() * 10) + 85,
                    Math.floor(Math.random() * 10) + 85,
                    Math.floor(Math.random() * 10) + 85
                ]
            };

            this.updateData(newData);
            this.element.classList.remove('loading');

            this.emit('data-refreshed', newData);
        }, 1500);
    }

    updateTimeRange(timeRange) {
        this.emit('time-range-changed', timeRange);
        this.refreshData();
    }

    showTooltip(element) {
        const tooltip = createElement('div', {
            className: 'tooltip show',
            textContent: element.getAttribute('title')
        });

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.bottom + 8 + 'px';

        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    getElement() {
        return this.element;
    }

    destroy() {
        // 销毁所有图表
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // 移除工具提示
        this.hideTooltip();

        // 移除元素
        if (this.element) {
            this.element.remove();
        }

        // 移除样式
        const style = document.head.querySelector('style[data-charts-component]');
        if (style) {
            style.remove();
        }
    }

    // 公共方法，在DOM加载完成后初始化图表
    async mount() {
        await this.initCharts();
        return this.element;
    }
}
