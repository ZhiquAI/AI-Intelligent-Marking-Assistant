/**
 * 智学AI - 实时值显示组件
 * 提供实时数据展示、动画效果和性能监控功能
 */

import { EventEmitter } from '../utils/event-manager.js';
import { TemplateLoader } from '../utils/template-loader.js';
import { safeSetHTML, safeSetText, safeCreateElement } from '../utils/safe-html.js';
import { validateData, escapeHtml } from '../utils/security-utils.js';

export class RealtimeDisplay extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            updateInterval: 1000,      // 更新间隔（毫秒）
            animationDuration: 300,    // 动画时长
            maxHistoryPoints: 100,     // 最大历史数据点数
            enableSmoothing: true,     // 启用数据平滑
            enablePredictions: false,  // 启用预测功能
            precision: 2,             // 数值精度
            theme: 'auto',            // 主题
            showTrend: true,          // 显示趋势
            showSparkline: true,      // 显示迷你图表
            showStats: true,          // 显示统计信息
            ...options
        };

        // 核心组件
        this.templateLoader = new TemplateLoader();

        // 数据管理
        this.dataSources = new Map();
        this.displayValues = new Map();
        this.historyData = new Map();
        this.trends = new Map();
        this.stats = new Map();
        this.predictions = new Map();

        // 状态管理
        this.isVisible = false;
        this.isUpdating = false;
        this.updateTimer = null;

        // 缓存DOM元素
        this.container = null;
        this.elements = {};

        // 动画相关
        this.animationFrame = null;
        this.easingFunctions = this.createEasingFunctions();

        // 初始化
        this.init();
    }

    init() {
        try {
            console.log('实时显示组件初始化中...');
            this.createContainer();
            this.setupEventListeners();
            this.startUpdating();
            console.log('实时显示组件初始化完成');
            this.emit('initialized');
        } catch (error) {
            console.error('实时显示组件初始化失败:', error);
            this.emit('error', error);
        }
    }

    createContainer() {
        this.container = safeCreateElement('div', {
            id: 'zhixue-realtime-display',
            className: `zhixue-realtime-display theme-${this.options.theme}`,
            style: {
                position: 'fixed',
                top: '10px',
                right: '10px',
                zIndex: '2147483645',
                opacity: '0',
                transition: `opacity ${this.options.animationDuration}ms ease-in-out`,
                pointerEvents: 'none'
            }
        });

        const containerHTML = `
            <div class="display-header">
                <div class="header-title">
                    <span class="icon">📊</span>
                    <span class="title-text">实时监控</span>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost btn-xs" data-action="toggle-stats" title="切换统计信息">
                        <span class="icon">📈</span>
                    </button>
                    <button class="btn btn-ghost btn-xs" data-action="toggle-predictions" title="切换预测">
                        <span class="icon">🔮</span>
                    </button>
                    <button class="btn btn-ghost btn-xs" data-action="clear-history" title="清除历史">
                        <span class="icon">🗑️</span>
                    </button>
                    <button class="btn btn-ghost btn-xs close-btn" data-action="close" title="关闭">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>

            <div class="display-content">
                <div class="metrics-grid" data-ref="metricsGrid">
                    <!-- 动态生成指标卡片 -->
                </div>
                <div class="stats-panel ${this.options.showStats ? 'visible' : ''}" data-ref="statsPanel">
                    <div class="stats-content" data-ref="statsContent">
                        <!-- 动态生成统计信息 -->
                    </div>
                </div>
            </div>
        `;

        safeSetHTML(this.container, containerHTML);
        document.body.appendChild(this.container);

        // 缓存DOM元素
        this.cacheElements();
    }

    /**
     * 注册数据源
     * @param {string} id - 数据源ID
     * @param {Object} config - 数据源配置
     */
    registerDataSource(id, config = {}) {
        const validation = validateData({ id, config }, 'object');
        if (!validation.valid) {
            throw new Error(`数据源配置无效: ${validation.error}`);
        }

        const dataSource = {
            id,
            name: config.name || id,
            description: config.description || '',
            type: config.type || 'number',      // number, percentage, rate, duration
            unit: config.unit || '',
            min: config.min ?? 0,
            max: config.max ?? 100,
            thresholds: config.thresholds || {},  // { warning: 80, error: 95 }
            color: config.color || this.getDefaultColor(),
            dataProvider: config.dataProvider || null,
            formatter: config.formatter || this.createFormatter(config.type, config.unit),
            updateStrategy: config.updateStrategy || 'immediate', // immediate, debounced, throttled
            smoothingFactor: config.smoothingFactor ?? 0.3,
            ...config
        };

        // 初始化数据
        this.dataSources.set(id, dataSource);
        this.displayValues.set(id, 0);
        this.historyData.set(id, []);
        this.trends.set(id, { direction: 'stable', change: 0 });
        this.stats.set(id, this.calculateInitialStats(dataSource));

        // 创建指标卡片
        this.createMetricCard(dataSource);

        this.emit('dataSourceRegistered', { id, dataSource });
        return id;
    }

    /**
     * 更新数据源值
     * @param {string} id - 数据源ID
     * @param {number} value - 新值
     * @param {number} timestamp - 时间戳
     */
    updateValue(id, value, timestamp = Date.now()) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) {
            console.warn(`未知的数据源: ${id}`);
            return;
        }

        const oldValue = this.displayValues.get(id) || 0;
        const history = this.historyData.get(id);

        // 应用平滑处理
        let displayValue = value;
        if (this.options.enableSmoothing && history.length > 0) {
            const lastValue = history[history.length - 1].value;
            displayValue = this.smoothValue(lastValue, value, dataSource.smoothingFactor);
        }

        // 更新显示值
        this.displayValues.set(id, displayValue);

        // 添加到历史数据
        history.push({ value: displayValue, timestamp });
        if (history.length > this.options.maxHistoryPoints) {
            history.shift();
        }

        // 计算趋势
        this.calculateTrend(id);

        // 更新统计信息
        this.updateStats(id);

        // 生成预测
        if (this.options.enablePredictions) {
            this.generatePrediction(id);
        }

        // 更新UI
        this.updateMetricCard(id);

        this.emit('valueUpdated', { id, value: displayValue, oldValue, timestamp });
    }

    /**
     * 创建指标卡片
     * @param {Object} dataSource - 数据源对象
     */
    createMetricCard(dataSource) {
        const metricsGrid = this.elements.metricsGrid;
        if (!metricsGrid) return;

        const card = safeCreateElement('div', {
            className: 'metric-card',
            'data-metric-id': dataSource.id,
            style: {
                '--metric-color': dataSource.color
            }
        });

        const cardHTML = `
            <div class="metric-header">
                <div class="metric-info">
                    <h4 class="metric-title">${escapeHtml(dataSource.name)}</h4>
                    <p class="metric-desc">${escapeHtml(dataSource.description)}</p>
                </div>
                <div class="metric-actions">
                    <button class="btn btn-ghost btn-xs" data-action="toggle-details" data-metric="${dataSource.id}" title="详情">
                        <span class="icon">ℹ️</span>
                    </button>
                </div>
            </div>

            <div class="metric-main">
                <div class="metric-value" data-metric-value="${dataSource.id}">
                    <span class="value-number">0</span>
                    <span class="value-unit">${escapeHtml(dataSource.unit)}</span>
                </div>
                <div class="metric-trend" data-metric-trend="${dataSource.id}">
                    <span class="trend-icon">→</span>
                    <span class="trend-value">0%</span>
                </div>
            </div>

            <div class="metric-visual">
                ${this.options.showSparkline ? `
                    <div class="sparkline" data-sparkline="${dataSource.id}">
                        <canvas width="100" height="30"></canvas>
                    </div>
                ` : ''}
                <div class="metric-progress" data-metric-progress="${dataSource.id}">
                    <div class="progress-bar" style="width: 0%"></div>
                    <div class="progress-thresholds">
                        <div class="threshold warning" style="left: ${dataSource.thresholds.warning || 80}%"></div>
                        <div class="threshold error" style="left: ${dataSource.thresholds.error || 95}%"></div>
                    </div>
                </div>
            </div>

            <div class="metric-details" data-metric-details="${dataSource.id}" style="display: none;">
                <div class="detail-row">
                    <span class="detail-label">最小值:</span>
                    <span class="detail-value" data-detail-min="${dataSource.id}">-</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">最大值:</span>
                    <span class="detail-value" data-detail-max="${dataSource.id}">-</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">平均值:</span>
                    <span class="detail-value" data-detail-avg="${dataSource.id}">-</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">标准差:</span>
                    <span class="detail-value" data-detail-std="${dataSource.id}">-</span>
                </div>
            </div>
        `;

        safeSetHTML(card, cardHTML);
        metricsGrid.appendChild(card);
    }

    /**
     * 更新指标卡片
     * @param {string} id - 指标ID
     */
    updateMetricCard(id) {
        const card = this.container.querySelector(`[data-metric-id="${id}"]`);
        if (!card) return;

        const dataSource = this.dataSources.get(id);
        const displayValue = this.displayValues.get(id);
        const trend = this.trends.get(id);
        const stats = this.stats.get(id);
        const history = this.historyData.get(id);

        // 更新数值显示
        const valueElement = card.querySelector('[data-metric-value]');
        if (valueElement) {
            const numberElement = valueElement.querySelector('.value-number');
            const formattedValue = dataSource.formatter(displayValue);
            safeSetText(numberElement, formattedValue);
            this.animateValue(numberElement, formattedValue);
        }

        // 更新趋势
        const trendElement = card.querySelector('[data-metric-trend]');
        if (trendElement) {
            const iconElement = trendElement.querySelector('.trend-icon');
            const valueElement = trendElement.querySelector('.trend-value');

            safeSetText(iconElement, this.getTrendIcon(trend.direction));
            safeSetText(valueElement, `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%`);

            trendElement.className = `metric-trend ${trend.direction}`;
        }

        // 更新进度条
        const progressElement = card.querySelector('[data-metric-progress]');
        if (progressElement) {
            const progressBar = progressElement.querySelector('.progress-bar');
            const percentage = this.normalizeValue(displayValue, dataSource.min, dataSource.max);
            progressBar.style.width = `${percentage}%`;

            // 应用阈值样式
            const warningThreshold = dataSource.thresholds.warning || 80;
            const errorThreshold = dataSource.thresholds.error || 95;

            if (percentage >= errorThreshold) {
                progressBar.className = 'progress-bar error';
            } else if (percentage >= warningThreshold) {
                progressBar.className = 'progress-bar warning';
            } else {
                progressBar.className = 'progress-bar normal';
            }
        }

        // 更新迷你图表
        if (this.options.showSparkline && history.length > 1) {
            this.updateSparkline(id, history);
        }

        // 更新详细信息
        const detailsElement = card.querySelector('[data-metric-details]');
        if (detailsElement) {
            const minElement = card.querySelector(`[data-detail-min="${id}"]`);
            const maxElement = card.querySelector(`[data-detail-max="${id}"]`);
            const avgElement = card.querySelector(`[data-detail-avg="${id}"]`);
            const stdElement = card.querySelector(`[data-detail-std="${id}"]`);

            if (minElement) safeSetText(minElement, dataSource.formatter(stats.min));
            if (maxElement) safeSetText(maxElement, dataSource.formatter(stats.max));
            if (avgElement) safeSetText(avgElement, dataSource.formatter(stats.mean));
            if (stdElement) safeSetText(stdElement, dataSource.formatter(stats.stdDev));
        }
    }

    /**
     * 更新迷你图表
     * @param {string} id - 指标ID
     * @param {Array} history - 历史数据
     */
    updateSparkline(id, history) {
        const sparklineContainer = this.container.querySelector(`[data-sparkline="${id}"]`);
        if (!sparklineContainer || history.length < 2) return;

        const canvas = sparklineContainer.querySelector('canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 清除画布
        ctx.clearRect(0, 0, width, height);

        const dataSource = this.dataSources.get(id);
        const values = history.map(point => point.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        // 绘制线条
        ctx.strokeStyle = dataSource.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        values.forEach((value, index) => {
            const x = (index / (values.length - 1)) * width;
            const y = height - ((value - min) / range) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // 绘制填充区域
        ctx.fillStyle = dataSource.color + '20';
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // 绘制最后一个点
        const lastX = width;
        const lastY = height - ((values[values.length - 1] - min) / range) * height;

        ctx.fillStyle = dataSource.color;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 计算趋势
     * @param {string} id - 指标ID
     */
    calculateTrend(id) {
        const history = this.historyData.get(id);
        if (history.length < 2) return;

        const recent = history.slice(-10); // 最近10个数据点
        const older = history.slice(-20, -10); // 之前10个数据点

        if (older.length === 0) return;

        const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, point) => sum + point.value, 0) / older.length;

        const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
        let direction = 'stable';

        if (changePercent > 5) {
            direction = 'up';
        } else if (changePercent < -5) {
            direction = 'down';
        }

        this.trends.set(id, {
            direction,
            change: changePercent
        });
    }

    /**
     * 更新统计信息
     * @param {string} id - 指标ID
     */
    updateStats(id) {
        const history = this.historyData.get(id);
        if (history.length === 0) return;

        const values = history.map(point => point.value);
        const stats = this.calculateStats(values);
        this.stats.set(id, stats);
    }

    /**
     * 生成预测
     * @param {string} id - 指标ID
     */
    generatePrediction(id) {
        const history = this.historyData.get(id);
        if (history.length < 10) return;

        // 简单的线性回归预测
        const values = history.map((point, index) => ({ x: index, y: point.value }));
        const trend = this.calculateLinearTrend(values);

        // 预测未来5个点
        const predictions = [];
        for (let i = 1; i <= 5; i++) {
            const futureX = history.length + i;
            const predictedY = trend.slope * futureX + trend.intercept;
            predictions.push({
                value: predictedY,
                timestamp: Date.now() + (i * this.options.updateInterval),
                confidence: Math.max(0.5, 1 - (i * 0.1))
            });
        }

        this.predictions.set(id, predictions);
    }

    /**
     * 计算线性趋势
     * @param {Array} points - 数据点 [{x, y}]
     * @returns {Object} 趋势信息 {slope, intercept}
     */
    calculateLinearTrend(points) {
        const n = points.length;
        const sumX = points.reduce((sum, p) => sum + p.x, 0);
        const sumY = points.reduce((sum, p) => sum + p.y, 0);
        const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
        const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * 数值平滑处理
     * @param {number} oldValue - 旧值
     * @param {number} newValue - 新值
     * @param {number} factor - 平滑因子
     * @returns {number} 平滑后的值
     */
    smoothValue(oldValue, newValue, factor) {
        return oldValue * (1 - factor) + newValue * factor;
    }

    /**
     * 归一化数值
     * @param {number} value - 原始值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 归一化后的值 (0-100)
     */
    normalizeValue(value, min, max) {
        const range = max - min || 1;
        return Math.max(0, Math.min(100, ((value - min) / range) * 100));
    }

    /**
     * 动画更新数值
     * @param {HTMLElement} element - 元素
     * @param {string} newValue - 新值
     */
    animateValue(element, newValue) {
        const currentValue = element.textContent;
        if (currentValue === newValue) return;

        element.style.transform = 'scale(1.1)';
        element.style.transition = `transform ${this.options.animationDuration}ms ease-out`;

        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, this.options.animationDuration / 2);
    }

    /**
     * 获取趋势图标
     * @param {string} direction - 趋势方向
     * @returns {string} 趋势图标
     */
    getTrendIcon(direction) {
        const icons = {
            up: '↑',
            down: '↓',
            stable: '→'
        };
        return icons[direction] || '→';
    }

    /**
     * 创建格式化器
     * @param {string} type - 数据类型
     * @param {string} unit - 单位
     * @returns {Function} 格式化函数
     */
    createFormatter(type, unit) {
        switch (type) {
            case 'percentage':
                return (value) => `${value.toFixed(this.options.precision)}%`;
            case 'rate':
                return (value) => `${value.toFixed(this.options.precision)}/${unit}`;
            case 'duration':
                return (value) => this.formatDuration(value);
            case 'bytes':
                return (value) => this.formatBytes(value);
            default:
                return (value) => `${value.toFixed(this.options.precision)}${unit ? ' ' + unit : ''}`;
        }
    }

    /**
     * 格式化时长
     * @param {number} ms - 毫秒
     * @returns {string} 格式化的时长
     */
    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms.toFixed(0)}ms`;
        } else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        } else {
            return `${(ms / 60000).toFixed(1)}m`;
        }
    }

    /**
     * 格式化字节
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的字节大小
     */
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(this.options.precision)} ${units[unitIndex]}`;
    }

    /**
     * 计算统计信息
     * @param {Array} values - 数值数组
     * @returns {Object} 统计信息
     */
    calculateStats(values) {
        if (values.length === 0) {
            return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean,
            median,
            stdDev,
            count: values.length
        };
    }

    /**
     * 计算初始统计信息
     * @param {Object} dataSource - 数据源
     * @returns {Object} 初始统计信息
     */
    calculateInitialStats(dataSource) {
        return {
            min: dataSource.min || 0,
            max: dataSource.max || 0,
            mean: 0,
            median: 0,
            stdDev: 0,
            count: 0
        };
    }

    /**
     * 获取默认颜色
     * @returns {string} 颜色值
     */
    getDefaultColor() {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
        return colors[this.dataSources.size % colors.length];
    }

    /**
     * 创建缓动函数
     * @returns {Object} 缓动函数集合
     */
    createEasingFunctions() {
        return {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        };
    }

    /**
     * 开始自动更新
     */
    startUpdating() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.updateAllDataSources();
        }, this.options.updateInterval);

        this.isUpdating = true;
    }

    /**
     * 停止自动更新
     */
    stopUpdating() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        this.isUpdating = false;
    }

    /**
     * 更新所有数据源
     */
    async updateAllDataSources() {
        for (const [id, dataSource] of this.dataSources) {
            try {
                if (dataSource.dataProvider && typeof dataSource.dataProvider === 'function') {
                    const newValue = await dataSource.dataProvider();
                    this.updateValue(id, newValue);
                }
            } catch (error) {
                console.error(`更新数据源 ${id} 失败:`, error);
                this.emit('updateError', { id, error });
            }
        }
    }

    /**
     * 清除历史数据
     * @param {string} id - 数据源ID，不提供则清除所有
     */
    clearHistory(id = null) {
        if (id) {
            this.historyData.set(id, []);
            this.trends.set(id, { direction: 'stable', change: 0 });
            this.predictions.set(id, []);
        } else {
            this.historyData.forEach((_, key) => {
                this.historyData.set(key, []);
                this.trends.set(key, { direction: 'stable', change: 0 });
                this.predictions.set(key, []);
            });
        }

        this.emit('historyCleared', { id });
    }

    /**
     * 设置选项
     * @param {Object} options - 新选项
     */
    setOptions(options) {
        Object.assign(this.options, options);

        // 重新设置更新间隔
        if (options.updateInterval !== undefined) {
            if (this.isUpdating) {
                this.startUpdating();
            }
        }

        // 更新主题
        if (options.theme !== undefined) {
            this.updateTheme();
        }

        this.emit('optionsUpdated', options);
    }

    /**
     * 更新主题
     */
    updateTheme() {
        this.container.className = this.container.className.replace(/theme-\w+/g, '');
        this.container.classList.add(`theme-${this.options.theme}`);
    }

    /**
     * 显示面板
     */
    show() {
        if (this.isVisible) return;

        this.container.style.opacity = '1';
        this.container.style.pointerEvents = '';
        this.isVisible = true;
        this.emit('shown');
    }

    /**
     * 隐藏面板
     */
    hide() {
        if (!this.isVisible) return;

        this.container.style.opacity = '0';
        this.container.style.pointerEvents = 'none';
        this.isVisible = false;
        this.emit('hidden');
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        const selectors = [
            'metricsGrid',
            'statsPanel',
            'statsContent'
        ];

        selectors.forEach(selector => {
            const element = this.container.querySelector(`[data-ref="${selector}"]`);
            if (element) {
                this.elements[selector] = element;
            }
        });
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        this.container.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]');
            if (!action) return;

            event.preventDefault();

            switch (action.dataset.action) {
                case 'close':
                    this.hide();
                    break;
                case 'toggle-stats':
                    this.toggleStats();
                    break;
                case 'toggle-predictions':
                    this.togglePredictions();
                    break;
                case 'clear-history':
                    this.clearHistory();
                    break;
                case 'toggle-details':
                    this.toggleDetails(action.dataset.metric);
                    break;
            }
        });

        // 键盘快捷键
        document.addEventListener('keydown', (event) => {
            if (this.isVisible && event.key === 'Escape') {
                this.hide();
            }
        });
    }

    /**
     * 切换统计信息显示
     */
    toggleStats() {
        this.options.showStats = !this.options.showStats;
        const statsPanel = this.elements.statsPanel;
        if (statsPanel) {
            statsPanel.classList.toggle('visible', this.options.showStats);
        }
    }

    /**
     * 切换预测功能
     */
    togglePredictions() {
        this.options.enablePredictions = !this.options.enablePredictions;
        this.emit('predictionsToggled', this.options.enablePredictions);
    }

    /**
     * 切换详情显示
     * @param {string} metricId - 指标ID
     */
    toggleDetails(metricId) {
        const detailsElement = this.container.querySelector(`[data-metric-details="${metricId}"]`);
        if (detailsElement) {
            const isVisible = detailsElement.style.display !== 'none';
            detailsElement.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * 获取所有数据源的当前值
     * @returns {Object} 数据源值映射
     */
    getAllValues() {
        const values = {};
        this.displayValues.forEach((value, id) => {
            values[id] = value;
        });
        return values;
    }

    /**
     * 获取指定数据源的详细信息
     * @param {string} id - 数据源ID
     * @returns {Object} 详细信息
     */
    getDataSourceInfo(id) {
        const dataSource = this.dataSources.get(id);
        if (!dataSource) return null;

        return {
            config: dataSource,
            currentValue: this.displayValues.get(id),
            history: this.historyData.get(id),
            trend: this.trends.get(id),
            stats: this.stats.get(id),
            predictions: this.predictions.get(id)
        };
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.stopUpdating();

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.removeAllListeners();

        this.dataSources.clear();
        this.displayValues.clear();
        this.historyData.clear();
        this.trends.clear();
        this.stats.clear();
        this.predictions.clear();

        this.container = null;
        this.elements = {};

        console.log('实时显示组件已销毁');
    }
}

// 创建默认实例
export const defaultRealtimeDisplay = new RealtimeDisplay();

// 导出到全局
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.RealtimeDisplay = RealtimeDisplay;
    window.defaultRealtimeDisplay = defaultRealtimeDisplay;
}

export default RealtimeDisplay;