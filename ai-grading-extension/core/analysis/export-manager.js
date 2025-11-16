// ============================================================================
// 智学网AI阅卷助手 - 导出管理模块
// 100%还原原HTML中的导出管理逻辑
// ============================================================================

export class ExportManager {
    constructor() {
        this.exportHistory = [];
        this.maxHistorySize = 50;
        
    }

    /**
     * 导出阅卷数据
     * @param {Array} data - 阅卷数据
     * @param {string} format - 导出格式
     * @param {Object} options - 导出选项
     * @returns {string} 导出结果
     */
    exportGradingData(data, format = 'excel', options = {}) {
        

        const exportConfig = {
            includeDetails: options.includeDetails !== false,
            includeScores: options.includeScores !== false,
            includeAnalysis: options.includeAnalysis !== false,
            includeStatistics: options.includeStatistics !== false
        };

        let result = null;
        switch (format.toLowerCase()) {
            case 'excel':
            case 'xlsx':
                result = this.exportToExcel(data, exportConfig);
                break;
            case 'csv':
                result = this.exportToCSV(data, exportConfig);
                break;
            case 'json':
                result = this.exportToJSON(data, exportConfig);
                break;
            case 'pdf':
                result = this.exportToPDF(data, exportConfig);
                break;
            default:
                // // // console.error('❌ 不支持的导出格式:', format);
                this.showToast('error', '导出失败', `不支持的格式: ${format}`);
                return null;
        }

        if (result) {
            this.addToHistory({
                type: 'grading',
                format,
                timestamp: Date.now(),
                count: data.length
            });
        }

        return result;
    }

    /**
     * 导出复核记录
     * @param {Array} records - 复核记录
     * @param {string} format - 导出格式
     * @returns {string} 导出结果
     */
    exportReviewRecords(records, format = 'pdf') {
        

        let result = null;
        switch (format.toLowerCase()) {
            case 'pdf':
                result = this.exportReviewToPDF(records);
                break;
            case 'excel':
            case 'xlsx':
                result = this.exportReviewToExcel(records);
                break;
            case 'csv':
                result = this.exportReviewToCSV(records);
                break;
            case 'json':
                result = this.exportReviewToJSON(records);
                break;
            default:
                // // // console.error('❌ 不支持的导出格式:', format);
                return null;
        }

        if (result) {
            this.addToHistory({
                type: 'review',
                format,
                timestamp: Date.now(),
                count: records.length
            });
        }

        return result;
    }

    /**
     * 导出统计报告
     * @param {Object} statistics - 统计数据
     * @param {string} format - 导出格式
     * @returns {string} 导出结果
     */
    exportStatisticsReport(statistics, format = 'pdf') {
        

        let result = null;
        switch (format.toLowerCase()) {
            case 'pdf':
                result = this.exportStatisticsToPDF(statistics);
                break;
            case 'excel':
            case 'xlsx':
                result = this.exportStatisticsToExcel(statistics);
                break;
            case 'csv':
                result = this.exportStatisticsToCSV(statistics);
                break;
            case 'json':
                result = this.exportStatisticsToJSON(statistics);
                break;
            default:
                // // // console.error('❌ 不支持的导出格式:', format);
                return null;
        }

        if (result) {
            this.addToHistory({
                type: 'statistics',
                format,
                timestamp: Date.now()
            });
        }

        return result;
    }

    /**
     * 导出为Excel
     * @param {Array} data - 数据
     * @param {Object} config - 配置
     * @returns {string} 导出内容
     */
    exportToExcel(data, config) {
        
        this.showToast('info', '导出中', 'Excel格式导出功能开发中');
        return null;
    }

    /**
     * 导出为CSV
     * @param {Array} data - 数据
     * @param {Object} config - 配置
     * @returns {string} CSV内容
     */
    exportToCSV(data, config) {
        

        if (!data || data.length === 0) {
            // console.warn('⚠️ 没有数据可导出');
            return '';
        }

        // 表头
        const headers = ['序号', '题目ID', '题目标题', '学生姓名', '得分', '满分', '得分率', '阅卷时间'];
        if (config.includeAnalysis) {
            headers.push('AI分析', '复核状态');
        }

        // 数据行
        const rows = data.map((item, index) => [
            index + 1,
            item.questionId || '',
            item.questionTitle || '',
            item.studentName || '',
            item.score || 0,
            item.maxScore || 100,
            ((item.score / (item.maxScore || 100)) * 100).toFixed(1) + '%',
            new Date(item.timestamp).toLocaleString('zh-CN')
        ]);

        if (config.includeAnalysis) {
            data.forEach((item, index) => {
                rows[index].push(item.aiAnalysis || '');
                rows[index].push(item.reviewStatus || '未复核');
            });
        }

        // 构建CSV
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        this.downloadFile(csvContent, 'grading-data.csv', 'text/csv');
        this.showToast('success', '导出成功', 'CSV文件已下载');

        return csvContent;
    }

    /**
     * 导出为JSON
     * @param {Array} data - 数据
     * @param {Object} config - 配置
     * @returns {string} JSON内容
     */
    exportToJSON(data, config) {
        

        const exportData = {
            exportTime: new Date().toISOString(),
            totalRecords: data.length,
            data: data
        };

        if (config.includeStatistics) {
            exportData.statistics = this.calculateStatistics(data);
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        this.downloadFile(jsonString, 'grading-data.json', 'application/json');
        this.showToast('success', '导出成功', 'JSON文件已下载');

        return jsonString;
    }

    /**
     * 导出为PDF
     * @param {Array} data - 数据
     * @param {Object} config - 配置
     * @returns {Object} PDF对象
     */
    exportToPDF(data, config) {
        

        if (typeof window.jsPDF === 'undefined') {
            // // // console.error('❌ 未找到jsPDF库');
            this.showToast('error', '导出失败', '未找到PDF生成库');
            return null;
        }

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        // 设置字体
        doc.setFont('helvetica');

        // 标题
        doc.setFontSize(20);
        doc.text('智学网AI阅卷助手 - 阅卷数据报告', 20, 20);

        // 导出时间
        doc.setFontSize(10);
        doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);

        // 统计信息
        doc.setFontSize(12);
        doc.text('统计信息', 20, 45);
        doc.setFontSize(10);

        const stats = this.calculateStatistics(data);
        doc.text(`总记录数: ${data.length}`, 20, 55);
        doc.text(`平均分: ${stats.average}`, 20, 62);
        doc.text(`最高分: ${stats.max}`, 20, 69);
        doc.text(`最低分: ${stats.min}`, 20, 76);
        doc.text(`及格率: ${stats.passRate}%`, 20, 83);

        // 数据详情
        if (config.includeDetails) {
            doc.setFontSize(12);
            doc.text('数据详情', 20, 97);

            let yPos = 107;
            const lineHeight = 6;

            data.forEach((item, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(8);
                doc.text(`${index + 1}. ${item.questionTitle || item.questionId}`, 20, yPos);
                doc.text(`   ${item.studentName}: ${item.score}/${item.maxScore || 100}分`, 20, yPos + 3);
                doc.text(`   ${new Date(item.timestamp).toLocaleString('zh-CN')}`, 20, yPos + 5);

                yPos += lineHeight;
            });
        }

        // 下载文件
        doc.save('grading-data-report.pdf');
        this.showToast('success', '导出成功', 'PDF报告已生成并下载');

        return doc;
    }

    /**
     * 导出复核记录为PDF
     * @param {Array} records - 复核记录
     * @returns {Object} PDF对象
     */
    exportReviewToPDF(records) {
        if (typeof window.jsPDF === 'undefined') {
            // // // console.error('❌ 未找到jsPDF库');
            return null;
        }

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('智学网AI阅卷助手 - 复核记录报告', 20, 20);

        doc.setFontSize(10);
        doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);

        doc.setFontSize(12);
        doc.text('统计信息', 20, 45);
        doc.setFontSize(10);
        doc.text(`总记录数: ${records.length}`, 20, 55);

        const confirmed = records.filter(r => r.status === 'confirmed').length;
        const modified = records.filter(r => r.status === 'modified').length;
        const pending = records.filter(r => r.status === 'pending').length;

        doc.text(`已确认: ${confirmed}`, 20, 62);
        doc.text(`已调整: ${modified}`, 20, 69);
        doc.text(`待复核: ${pending}`, 20, 76);

        // 记录详情
        if (records.length > 0) {
            doc.setFontSize(12);
            doc.text('记录详情', 20, 90);

            let yPos = 100;
            const lineHeight = 7;

            records.forEach((record, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(9);
                doc.text(`[${index + 1}] ${record.questionTitle || record.questionId}`, 20, yPos);
                doc.text(`   ${record.originalScore} → ${record.newScore}`, 20, yPos + 4);
                doc.text(`   ${record.status} | ${record.reviewer}`, 20, yPos + 6);

                yPos += lineHeight;
            });
        }

        doc.save('review-records-report.pdf');
        return doc;
    }

    /**
     * 导出复核记录为CSV
     * @param {Array} records - 复核记录
     * @returns {string} CSV内容
     */
    exportReviewToCSV(records) {
        const headers = [
            '记录ID', '题目ID', '题目标题', '原始分数', '调整后分数',
            '复核状态', '确认次数', '调整次数', '复核教师', '复核时间'
        ];

        const rows = records.map(record => [
            record.id,
            record.questionId,
            record.questionTitle || '',
            record.originalScore || '',
            record.newScore || '',
            record.status || '',
            record.confirmations || '',
            record.modifications || '',
            record.reviewer || '',
            record.timestamp
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        this.downloadFile(csvContent, 'review-records.csv', 'text/csv');
        return csvContent;
    }

    /**
     * 导出复核记录为JSON
     * @param {Array} records - 复核记录
     * @returns {string} JSON内容
     */
    exportReviewToJSON(records) {
        const data = {
            exportTime: new Date().toISOString(),
            totalRecords: records.length,
            records: records
        };

        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, 'review-records.json', 'application/json');
        return jsonString;
    }

    /**
     * 导出统计为PDF
     * @param {Object} statistics - 统计数据
     * @returns {Object} PDF对象
     */
    exportStatisticsToPDF(statistics) {
        if (typeof window.jsPDF === 'undefined') {
            // // // console.error('❌ 未找到jsPDF库');
            return null;
        }

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('智学网AI阅卷助手 - 统计分析报告', 20, 20);

        doc.setFontSize(10);
        doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);

        doc.setFontSize(12);
        doc.text('基础统计', 20, 45);
        doc.setFontSize(10);

        const yStart = 55;
        const lineHeight = 7;

        doc.text(`总人数: ${statistics.total}`, 20, yStart);
        doc.text(`平均分: ${statistics.average}`, 20, yStart + lineHeight);
        doc.text(`最高分: ${statistics.max}`, 20, yStart + lineHeight * 2);
        doc.text(`最低分: ${statistics.min}`, 20, yStart + lineHeight * 3);

        doc.text(`及格率: ${statistics.passRate}%`, 20, yStart + lineHeight * 5);
        doc.text(`优秀率: ${statistics.excellentRate}%`, 20, yStart + lineHeight * 6);

        doc.save('statistics-report.pdf');
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
     * 计算统计数据
     * @param {Array} data - 数据
     * @returns {Object} 统计
     */
    calculateStatistics(data) {
        if (!data || data.length === 0) {
            return {
                total: 0,
                max: '0',
                min: '0',
                average: '0',
                passRate: '0'
            };
        }

        const scores = data.map(item => item.score || 0);
        const total = scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const average = (scores.reduce((sum, score) => sum + score, 0) / total).toFixed(1);
        const passCount = scores.filter(score => score >= 60).length;
        const passRate = ((passCount / total) * 100).toFixed(1);

        return { total, max: max.toFixed(1), min: min.toFixed(1), average, passRate };
    }

    /**
     * 添加到历史记录
     * @param {Object} entry - 记录项
     */
    addToHistory(entry) {
        this.exportHistory.push(entry);
        if (this.exportHistory.length > this.maxHistorySize) {
            this.exportHistory.shift();
        }
        
    }

    /**
     * 获取导出历史
     * @returns {Array} 历史记录
     */
    getExportHistory() {
        return [...this.exportHistory];
    }

    /**
     * 清空导出历史
     */
    clearHistory() {
        this.exportHistory = [];
        
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