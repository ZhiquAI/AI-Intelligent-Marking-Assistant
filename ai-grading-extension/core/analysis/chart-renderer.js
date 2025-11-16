// ============================================================================
// 智学网AI阅卷助手 - 图表渲染模块
// 100%还原原HTML中的图表渲染逻辑
// ============================================================================

export class ChartRenderer {
    constructor() {
        this.chart = null;
        this.chartData = [];
        
    }

    /**
     * 初始化Chart.js图表
     * @param {Array} data - 图表数据
     */
    initChart(data = []) {
        
        const ctx = document.getElementById('scoreDistributionChart');
        if (!ctx) {
            // console.error('❌ 未找到图表画布');
            return;
        }

        // 检查Chart.js是否已加载
        if (typeof Chart === 'undefined') {
            // console.error('❌ 未找到Chart.js库');
            return;
        }

        // 销毁现有图表
        if (this.chart) {
            this.chart.destroy();
        }

        // 计算统计数据
        const stats = this.calculateStatistics(data);

        // 获取图表类型
        const chartType = document.getElementById('chartTypeSelect')?.value || 'bar';

        // 准备图表数据
        const labels = Object.keys(stats.scoreRanges);
        const values = Object.values(stats.scoreRanges);

        // 图表配置
        const config = {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: '学生人数',
                    data: values,
                    backgroundColor: chartType === 'pie'
                        ? [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(250, 204, 21, 0.8)',
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(59, 130, 246, 0.8)'
                        ]
                        : 'rgba(59, 130, 246, 0.6)',
                    borderColor: chartType === 'pie'
                        ? [
                            'rgb(239, 68, 68)',
                            'rgb(251, 146, 60)',
                            'rgb(250, 204, 21)',
                            'rgb(34, 197, 94)',
                            'rgb(59, 130, 246)'
                        ]
                        : 'rgb(59, 130, 246)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: chartType === 'pie',
                        position: 'bottom'
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value}人 (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: chartType !== 'pie' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 10
                        }
                    }
                } : {}
            }
        };

        // 创建图表
        this.chart = new Chart(ctx, config);
        

        return this.chart;
    }

    /**
     * 更新图表
     * @param {Array} data - 新数据
     */
    updateChart(data = []) {
        
        if (!this.chart) {
            this.initChart(data);
            return;
        }

        // 更新数据
        const stats = this.calculateStatistics(data);
        this.chart.data.labels = Object.keys(stats.scoreRanges);
        this.chart.data.datasets[0].data = Object.values(stats.scoreRanges);

        // 更新图表
        this.chart.update();
    }

    /**
     * 切换图表类型
     * @param {string} type - 图表类型
     * @param {Array} data - 数据
     */
    changeChartType(type, data = []) {
        
        this.initChart(data);
    }

    /**
     * 计算统计数据
     * @param {Array} data - 原始数据
     * @returns {Object} 统计数据
     */
    calculateStatistics(data) {
        // 如果没有数据，使用模拟数据
        if (!data || data.length === 0) {
            data = this.generateMockData();
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
        const scoreRanges = {
            '0-20': 0,
            '21-40': 0,
            '41-60': 0,
            '61-80': 0,
            '81-100': 0
        };

        scores.forEach(score => {
            if (score >= 0 && score <= 20) scoreRanges['0-20']++;
            else if (score <= 40) scoreRanges['21-40']++;
            else if (score <= 60) scoreRanges['41-60']++;
            else if (score <= 80) scoreRanges['61-80']++;
            else if (score <= 100) scoreRanges['81-100']++;
        });

        // 计算及格率和优秀率
        const passCount = scores.filter(score => score >= 60).length;
        const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

        const excellentCount = scores.filter(score => score >= 90).length;
        const excellentRate = total > 0 ? ((excellentCount / total) * 100).toFixed(1) : 0;

        // 计算今日新增
        const todayCount = data.filter(item => {
            const today = new Date().toDateString();
            const itemDate = new Date(item.timestamp).toDateString();
            return today === itemDate;
        }).length;

        return {
            total,
            todayCount,
            max: max.toFixed(1),
            min: min.toFixed(1),
            average,
            median,
            stdDev,
            passRate,
            excellentRate,
            scoreRanges
        };
    }

    /**
     * 生成模拟数据
     * @returns {Array} 模拟数据
     */
    generateMockData() {
        const data = [];
        const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];

        for (let i = 0; i < 892; i++) {
            const score = Math.floor(Math.random() * 40) + 60; // 60-100分
            data.push({
                id: `student_${i + 1}`,
                score: score,
                subject: '历史',
                paperType: '论述题',
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 过去30天内的随机时间
                studentName: names[Math.floor(Math.random() * names.length)]
            });
        }

        return data;
    }

    /**
     * 获取图表实例
     * @returns {Object} Chart.js实例
     */
    getChart() {
        return this.chart;
    }

    /**
     * 销毁图表
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
    }

    /**
     * 导出图表为图片
     * @param {string} filename - 文件名
     */
    exportChartImage(filename = 'chart.png') {
        if (!this.chart) {
            // console.error('❌ 图表不存在');
            return;
        }

        const url = this.chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        
    }

    /**
     * 更新数据源
     * @param {Array} data - 新数据
     */
    setData(data) {
        this.chartData = data;
        this.updateChart(data);
    }

    /**
     * 获取当前数据
     * @returns {Array} 当前数据
     */
    getData() {
        return this.chartData;
    }
}
