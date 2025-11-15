// ============================================================================
// 智学网AI阅卷助手 - 统计分析模块
// 100%还原原HTML中的统计分析逻辑
// ============================================================================

export class Statistics {
    constructor() {
        this.statisticsData = [];
        this.currentStats = null;
        
    }

    /**
     * 计算综合统计
     * @param {Array} data - 原始数据
     * @returns {Object} 统计数据
     */
    calculateStatistics(data) {
        

        if (!data || data.length === 0) {
            return this.getDefaultStatistics();
        }

        const scores = data.map(item => item.score || 0);
        const total = scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);

        // 计算平均分
        const average = total > 0
            ? (scores.reduce((sum, score) => sum + score, 0) / total).toFixed(1)
            : 0;

        // 计算中位数
        const sortedScores = [...scores].sort((a, b) => a - b);
        const median = total > 0
            ? (total % 2 === 0
                ? ((sortedScores[total / 2 - 1] + sortedScores[total / 2]) / 2).toFixed(1)
                : sortedScores[Math.floor(total / 2)].toFixed(1))
            : 0;

        // 计算标准差
        const mean = parseFloat(average);
        const variance = total > 0
            ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / total
            : 0;
        const stdDev = Math.sqrt(variance).toFixed(1);

        // 计算分数区间分布
        const scoreRanges = this.calculateScoreRanges(scores);

        // 计算及格率和优秀率
        const passCount = scores.filter(score => score >= 60).length;
        const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

        const excellentCount = scores.filter(score => score >= 90).length;
        const excellentRate = total > 0 ? ((excellentCount / total) * 100).toFixed(1) : 0;

        // 计算各分数段人数
        const distribution = this.calculateDistribution(scores);

        // 计算难度指数
        const difficultyIndex = this.calculateDifficultyIndex(scores);

        // 计算区分度
        const discrimination = this.calculateDiscrimination(scores);

        this.currentStats = {
            total,
            max: max.toFixed(1),
            min: min.toFixed(1),
            average,
            median,
            stdDev,
            passRate,
            excellentRate,
            scoreRanges,
            distribution,
            difficultyIndex,
            discrimination,
            timestamp: Date.now()
        };

        
        return this.currentStats;
    }

    /**
     * 计算分数区间分布
     * @param {Array} scores - 分数数组
     * @returns {Object} 区间分布
     */
    calculateScoreRanges(scores) {
        const ranges = {
            '0-20': 0,
            '21-40': 0,
            '41-60': 0,
            '61-80': 0,
            '81-100': 0
        };

        scores.forEach(score => {
            if (score >= 0 && score <= 20) ranges['0-20']++;
            else if (score <= 40) ranges['21-40']++;
            else if (score <= 60) ranges['41-60']++;
            else if (score <= 80) ranges['61-80']++;
            else if (score <= 100) ranges['81-100']++;
        });

        return ranges;
    }

    /**
     * 计算分布详情
     * @param {Array} scores - 分数数组
     * @returns {Object} 分布详情
     */
    calculateDistribution(scores) {
        const distribution = {
            '0-10': 0,
            '11-20': 0,
            '21-30': 0,
            '31-40': 0,
            '41-50': 0,
            '51-60': 0,
            '61-70': 0,
            '71-80': 0,
            '81-90': 0,
            '91-100': 0
        };

        scores.forEach(score => {
            if (score >= 0 && score <= 10) distribution['0-10']++;
            else if (score <= 20) distribution['11-20']++;
            else if (score <= 30) distribution['21-30']++;
            else if (score <= 40) distribution['31-40']++;
            else if (score <= 50) distribution['41-50']++;
            else if (score <= 60) distribution['51-60']++;
            else if (score <= 70) distribution['61-70']++;
            else if (score <= 80) distribution['71-80']++;
            else if (score <= 90) distribution['81-90']++;
            else if (score <= 100) distribution['91-100']++;
        });

        return distribution;
    }

    /**
     * 计算难度指数
     * @param {Array} scores - 分数数组
     * @returns {number} 难度指数
     */
    calculateDifficultyIndex(scores) {
        if (scores.length === 0) return 0;
        const total = scores.reduce((sum, score) => sum + score, 0);
        const average = total / scores.length;
        return (average / 100).toFixed(3);
    }

    /**
     * 计算区分度
     * @param {Array} scores - 分数数组
     * @returns {number} 区分度
     */
    calculateDiscrimination(scores) {
        if (scores.length === 0) return 0;
        const sortedScores = [...scores].sort((a, b) => b - a);
        const highGroup = sortedScores.slice(0, Math.ceil(sortedScores.length * 0.27));
        const lowGroup = sortedScores.slice(-Math.ceil(sortedScores.length * 0.27));
        const highAverage = highGroup.reduce((sum, score) => sum + score, 0) / highGroup.length;
        const lowAverage = lowGroup.reduce((sum, score) => sum + score, 0) / lowGroup.length;
        return ((highAverage - lowAverage) / 100).toFixed(3);
    }

    /**
     * 获取默认统计数据
     * @returns {Object} 默认统计
     */
    getDefaultStatistics() {
        return {
            total: 0,
            max: '0.0',
            min: '0.0',
            average: '0.0',
            median: '0.0',
            stdDev: '0.0',
            passRate: '0.0',
            excellentRate: '0.0',
            scoreRanges: {
                '0-20': 0,
                '21-40': 0,
                '41-60': 0,
                '61-80': 0,
                '81-100': 0
            },
            distribution: {
                '0-10': 0,
                '11-20': 0,
                '21-30': 0,
                '31-40': 0,
                '41-50': 0,
                '51-60': 0,
                '61-70': 0,
                '71-80': 0,
                '81-90': 0,
                '91-100': 0
            },
            difficultyIndex: '0.000',
            discrimination: '0.000',
            timestamp: Date.now()
        };
    }

    /**
     * 获取趋势分析
     * @param {Array} data - 数据数组
     * @returns {Object} 趋势数据
     */
    getTrendAnalysis(data) {
        if (!data || data.length === 0) {
            return {
                trend: 'stable',
                changeRate: 0,
                predictions: []
            };
        }

        // 按时间排序
        const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

        // 计算移动平均
        const windowSize = 5;
        const movingAverages = [];
        for (let i = 0; i < sortedData.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = sortedData.slice(start, i + 1);
            const average = window.reduce((sum, item) => sum + (item.score || 0), 0) / window.length;
            movingAverages.push(average);
        }

        // 计算趋势
        const firstAvg = movingAverages[0];
        const lastAvg = movingAverages[movingAverages.length - 1];
        const changeRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg * 100) : 0;

        let trend = 'stable';
        if (changeRate > 5) trend = 'rising';
        else if (changeRate < -5) trend = 'falling';

        // 生成预测（简单线性预测）
        const predictions = this.generatePredictions(movingAverages);

        return {
            trend,
            changeRate: changeRate.toFixed(1),
            predictions,
            data: sortedData.map(item => ({
                timestamp: item.timestamp,
                score: item.score,
                movingAverage: movingAverages[sortedData.indexOf(item)]
            }))
        };
    }

    /**
     * 生成预测数据
     * @param {Array} averages - 移动平均数组
     * @returns {Array} 预测数据
     */
    generatePredictions(averages) {
        if (averages.length < 2) return [];

        const predictions = [];
        const lastValue = averages[averages.length - 1];
        const secondLastValue = averages[averages.length - 2];
        const trend = lastValue - secondLastValue;

        for (let i = 1; i <= 3; i++) {
            const predictedValue = lastValue + (trend * i);
            predictions.push({
                period: i,
                value: Math.max(0, Math.min(100, predictedValue)).toFixed(1)
            });
        }

        return predictions;
    }

    /**
     * 获取对比分析
     * @param {Array} currentData - 当前数据
     * @param {Array} previousData - 历史数据
     * @returns {Object} 对比结果
     */
    getComparisonAnalysis(currentData, previousData) {
        const current = this.calculateStatistics(currentData);
        const previous = this.calculateStatistics(previousData);

        return {
            current,
            previous,
            changes: {
                total: current.total - previous.total,
                average: (parseFloat(current.average) - parseFloat(previous.average)).toFixed(1),
                passRate: (parseFloat(current.passRate) - parseFloat(previous.passRate)).toFixed(1),
                excellentRate: (parseFloat(current.excellentRate) - parseFloat(previous.excellentRate)).toFixed(1)
            },
            improvement: {
                scoreImprovement: parseFloat(current.average) > parseFloat(previous.average),
                passRateImprovement: parseFloat(current.passRate) > parseFloat(previous.passRate),
                overallTrend: 'improving'
            }
        };
    }

    /**
     * 获取当前统计
     * @returns {Object} 当前统计
     */
    getCurrentStatistics() {
        return this.currentStats;
    }

    /**
     * 设置统计数据
     * @param {Array} data - 新数据
     */
    setData(data) {
        this.statisticsData = data;
        this.calculateStatistics(data);
    }

    /**
     * 获取数据
     * @returns {Array} 原始数据
     */
    getData() {
        return this.statisticsData;
    }

    /**
     * 导出统计报告
     * @param {string} format - 格式 (json/csv/pdf)
     * @returns {string} 导出的内容
     */
    exportReport(format = 'json') {
        if (!this.currentStats) {
            // console.warn('⚠️ 没有统计数据可导出');
            return '';
        }

        switch (format) {
            case 'json':
                return this.exportToJSON();
            case 'csv':
                return this.exportToCSV();
            case 'pdf':
                return this.generatePDFReport();
            default:
                // console.error('❌ 不支持的导出格式:', format);
                return '';
        }
    }

    /**
     * 导出为JSON
     * @returns {string} JSON字符串
     */
    exportToJSON() {
        const data = {
            exportTime: new Date().toISOString(),
            statistics: this.currentStats
        };

        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, 'statistics-report.json', 'application/json');
        

        return jsonString;
    }

    /**
     * 导出为CSV
     * @returns {string} CSV字符串
     */
    exportToCSV() {
        if (!this.currentStats) return '';

        const headers = ['指标', '数值'];
        const rows = [
            ['总人数', this.currentStats.total],
            ['最高分', this.currentStats.max],
            ['最低分', this.currentStats.min],
            ['平均分', this.currentStats.average],
            ['中位数', this.currentStats.median],
            ['标准差', this.currentStats.stdDev],
            ['及格率(%)', this.currentStats.passRate],
            ['优秀率(%)', this.currentStats.excellentRate],
            ['难度指数', this.currentStats.difficultyIndex],
            ['区分度', this.currentStats.discrimination]
        ];

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        this.downloadFile(csvContent, 'statistics-report.csv', 'text/csv');
        

        return csvContent;
    }

    /**
     * 生成PDF报告
     * @returns {Object} PDF对象
     */
    generatePDFReport() {
        

        if (typeof window.jsPDF === 'undefined') {
            // console.error('❌ 未找到jsPDF库');
            this.showToast('error', '导出失败', '未找到PDF生成库');
            return null;
        }

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        // 设置字体
        doc.setFont('helvetica');

        // 标题
        doc.setFontSize(20);
        doc.text('智学网AI阅卷助手 - 统计分析报告', 20, 20);

        // 导出时间
        doc.setFontSize(10);
        doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);

        // 统计信息
        doc.setFontSize(12);
        doc.text('基础统计', 20, 45);
        doc.setFontSize(10);

        const stats = this.currentStats;
        const yStart = 55;
        const lineHeight = 7;

        doc.text(`总人数: ${stats.total}`, 20, yStart);
        doc.text(`平均分: ${stats.average}`, 20, yStart + lineHeight);
        doc.text(`最高分: ${stats.max}`, 20, yStart + lineHeight * 2);
        doc.text(`最低分: ${stats.min}`, 20, yStart + lineHeight * 3);
        doc.text(`中位数: ${stats.median}`, 20, yStart + lineHeight * 4);
        doc.text(`标准差: ${stats.stdDev}`, 20, yStart + lineHeight * 5);

        // 成绩分布
        doc.setFontSize(12);
        doc.text('成绩分布', 120, 45);

        const ranges = Object.entries(stats.scoreRanges);
        ranges.forEach(([range, count], index) => {
            doc.setFontSize(9);
            doc.text(`${range}分: ${count}人`, 120, 55 + index * lineHeight);
        });

        // 指标分析
        doc.setFontSize(12);
        doc.text('指标分析', 20, 120);
        doc.setFontSize(10);

        doc.text(`及格率: ${stats.passRate}%`, 20, 130);
        doc.text(`优秀率: ${stats.excellentRate}%`, 20, 137);
        doc.text(`难度指数: ${stats.difficultyIndex}`, 20, 144);
        doc.text(`区分度: ${stats.discrimination}`, 20, 151);

        // 下载文件
        doc.save('statistics-report.pdf');
        this.showToast('success', '导出成功', 'PDF报告已生成并下载');

        return doc;
    }

    /**
     * 下载文件
     * @param {string} content - 文件内容
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * 显示Toast提示
     * @param {string} type - 类型
     * @param {string} title - 标题
     * @param {string} message - 消息
     */
    showToast(type, title, message) {
        // TODO: 实现Toast显示
        
    }
}