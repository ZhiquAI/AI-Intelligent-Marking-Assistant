// ============================================================================
// 智学网AI阅卷助手 - 文件导出模块
// 100%还原原HTML中的文件导出逻辑
// ============================================================================

export class FileExporter {
    constructor() {
        this.exportHistory = [];
        this.maxHistorySize = 50;
        this.supportedFormats = ['json', 'csv', 'xlsx', 'pdf'];
        
    }

    /**
     * 导出数据为文件
     * @param {Array|Object} data - 要导出的数据
     * @param {string} format - 导出格式
     * @param {Object} options - 导出选项
     * @returns {string|Object} 导出结果
     */
    exportFile(data, format = 'json', options = {}) {
         ? data.length : 1 });

        // 验证数据
        if (!data) {
            this.showToast('error', '导出失败', '没有数据可导出');
            return null;
        }

        // 验证格式
        if (!this.supportedFormats.includes(format.toLowerCase())) {
            this.showToast('error', '导出失败', `不支持的格式: ${format}`);
            return null;
        }

        let result = null;
        const filename = this.generateFilename(format, options);

        try {
            switch (format.toLowerCase()) {
                case 'json':
                    result = this.exportToJSON(data, filename, options);
                    break;
                case 'csv':
                    result = this.exportToCSV(data, filename, options);
                    break;
                case 'xlsx':
                case 'excel':
                    result = this.exportToExcel(data, filename, options);
                    break;
                case 'pdf':
                    result = this.exportToPDF(data, filename, options);
                    break;
            }

            if (result) {
                // 添加到历史记录
                this.addToHistory({
                    filename,
                    format,
                    size: this.getFileSize(data, format),
                    timestamp: Date.now(),
                    recordCount: Array.isArray(data) ? data.length : 1
                });

                this.showToast('success', '导出成功', `文件 ${filename} 已生成`);
            }

        } catch (error) {
            // console.error('❌ 导出失败:', error);
            this.showToast('error', '导出失败', error.message);
        }

        return result;
    }

    /**
     * 导出为JSON格式
     * @param {Array|Object} data - 数据
     * @param {string} filename - 文件名
     * @param {Object} options - 选项
     * @returns {string} JSON字符串
     */
    exportToJSON(data, filename, options = {}) {
        

        const exportData = {
            exportTime: new Date().toISOString(),
            version: '5.0',
            data: data
        };

        // 添加元数据
        if (options.includeMetadata) {
            exportData.metadata = {
                recordCount: Array.isArray(data) ? data.length : 1,
                fields: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [],
                exportedBy: '智学网AI阅卷助手'
            };
        }

        // 添加统计信息
        if (options.includeStatistics && Array.isArray(data)) {
            exportData.statistics = this.calculateStatistics(data);
        }

        const jsonString = JSON.stringify(exportData, null, options.prettyPrint ? 2 : 0);
        this.downloadFile(jsonString, filename, 'application/json');

        return jsonString;
    }

    /**
     * 导出为CSV格式
     * @param {Array|Object} data - 数据
     * @param {string} filename - 文件名
     * @param {Object} options - 选项
     * @returns {string} CSV字符串
     */
    exportToCSV(data, filename, options = {}) {
        

        // 如果不是数组，转换为数组
        const dataArray = Array.isArray(data) ? data : [data];

        if (dataArray.length === 0) {
            throw new Error('没有数据可导出');
        }

        // 获取所有字段
        const fields = options.fields || this.extractFields(dataArray);

        // 构建CSV内容
        const rows = [];

        // 添加表头
        if (options.includeHeaders !== false) {
            rows.push(fields);
        }

        // 添加数据行
        dataArray.forEach(item => {
            const row = fields.map(field => {
                const value = this.getNestedValue(item, field);
                return this.escapeCSVValue(value);
            });
            rows.push(row);
        });

        // 转换为CSV字符串
        const csvContent = rows
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

        return csvContent;
    }

    /**
     * 导出为Excel格式
     * @param {Array|Object} data - 数据
     * @param {string} filename - 文件名
     * @param {Object} options - 选项
     * @returns {null} 暂未实现
     */
    exportToExcel(data, filename, options = {}) {
        // console.warn('⚠️ Excel导出功能尚未实现');
        this.showToast('info', '功能提示', 'Excel导出功能开发中');
        return null;
    }

    /**
     * 导出为PDF格式
     * @param {Array|Object} data - 数据
     * @param {string} filename - 文件名
     * @param {Object} options - 选项
     * @returns {Object} PDF对象
     */
    exportToPDF(data, filename, options = {}) {
        

        if (typeof window.jsPDF === 'undefined') {
            throw new Error('未找到PDF生成库');
        }

        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        // 设置字体
        doc.setFont('helvetica');

        // 标题
        doc.setFontSize(20);
        const title = options.title || '智学网AI阅卷助手 - 数据报告';
        doc.text(title, 20, 20);

        // 导出时间
        doc.setFontSize(10);
        doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);

        let yPos = 45;

        // 如果是数组数据，显示表格
        if (Array.isArray(data)) {
            if (data.length === 0) {
                doc.setFontSize(12);
                doc.text('没有数据', 20, yPos);
            } else {
                // 显示前50条记录
                const maxRows = Math.min(data.length, 50);
                const fields = options.fields || this.extractFields(data);

                // 表头
                doc.setFontSize(10);
                doc.text('数据记录:', 20, yPos);
                yPos += 10;

                for (let i = 0; i < maxRows; i++) {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }

                    const item = data[i];
                    doc.setFontSize(8);

                    // 显示关键字段
                    const keyFields = fields.slice(0, 3); // 最多显示3个字段
                    const line = keyFields.map(field => {
                        const value = this.getNestedValue(item, field);
                        return `${field}: ${this.truncateText(String(value), 20)}`;
                    }).join(' | ');

                    doc.text(`${i + 1}. ${line}`, 20, yPos);
                    yPos += 6;
                }

                if (data.length > maxRows) {
                    yPos += 5;
                    doc.text(`... 还有 ${data.length - maxRows} 条记录`, 20, yPos);
                }
            }
        } else {
            // 单个对象，显示详情
            doc.setFontSize(12);
            doc.text('数据详情:', 20, yPos);
            yPos += 10;

            const fields = Object.keys(data);
            fields.forEach(field => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(10);
                const value = this.getNestedValue(data, field);
                const text = `${field}: ${this.truncateText(String(value), 50)}`;
                doc.text(text, 20, yPos);
                yPos += 7;
            });
        }

        // 下载文件
        doc.save(filename);
        return doc;
    }

    /**
     * 提取字段
     * @param {Array} dataArray - 数据数组
     * @returns {Array} 字段列表
     */
    extractFields(dataArray) {
        if (!dataArray || dataArray.length === 0) return [];

        const fields = new Set();

        dataArray.forEach(item => {
            if (item && typeof item === 'object') {
                Object.keys(item).forEach(key => fields.add(key));
            }
        });

        return Array.from(fields);
    }

    /**
     * 获取嵌套值
     * @param {Object} obj - 对象
     * @param {string} path - 路径
     * @returns {*} 值
     */
    getNestedValue(obj, path) {
        if (!obj) return '';

        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return '';
            }
        }

        return value || '';
    }

    /**
     * 转义CSV值
     * @param {*} value - 值
     * @returns {string} 转义后的值
     */
    escapeCSVValue(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return str.replace(/"/g, '""');
        }
        return str;
    }

    /**
     * 截断文本
     * @param {string} text - 文本
     * @param {number} maxLength - 最大长度
     * @returns {string} 截断后的文本
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * 生成文件名
     * @param {string} format - 格式
     * @param {Object} options - 选项
     * @returns {string} 文件名
     */
    generateFilename(format, options = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const prefix = options.prefix || 'export';
        const extension = format.toLowerCase() === 'excel' ? 'xlsx' : format.toLowerCase();
        return `${prefix}_${timestamp}.${extension}`;
    }

    /**
     * 计算文件大小（估算）
     * @param {Array|Object} data - 数据
     * @param {string} format - 格式
     * @returns {number} 大小（字节）
     */
    getFileSize(data, format) {
        const jsonString = JSON.stringify(data);
        const baseSize = new Blob([jsonString]).size;

        switch (format.toLowerCase()) {
            case 'json':
                return baseSize;
            case 'csv':
                return baseSize * 0.6; // CSV通常更小
            case 'pdf':
            case 'xlsx':
                return baseSize * 2; // PDF/Excel通常更大
            default:
                return baseSize;
        }
    }

    /**
     * 计算统计数据
     * @param {Array} data - 数据数组
     * @returns {Object} 统计信息
     */
    calculateStatistics(data) {
        const scores = data.map(item => parseFloat(item.score || 0)).filter(score => !isNaN(score));
        const total = scores.length;

        if (total === 0) {
            return {
                total: 0,
                average: 0,
                max: 0,
                min: 0
            };
        }

        return {
            total,
            average: (scores.reduce((sum, score) => sum + score, 0) / total).toFixed(2),
            max: Math.max(...scores).toFixed(2),
            min: Math.min(...scores).toFixed(2)
        };
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
     * 添加到导出历史
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
     * 获取支持的文件格式
     * @returns {Array} 格式列表
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
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