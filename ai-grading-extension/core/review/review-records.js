// ============================================================================
// 智学网AI阅卷助手 - 复核记录模块
// 100%还原原HTML中的复核记录逻辑
// ============================================================================

export class ReviewRecords {
    constructor() {
        this.records = [];
        this.maxRecords = 100; // 最大记录数
        
    }

    /**
     * 添加复核记录
     * @param {Object} record - 复核记录
     */
    addRecord(record) {
        

        const newRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...record
        };

        this.records.push(newRecord);

        // 保持最大记录数限制
        if (this.records.length > this.maxRecords) {
            this.records.shift();
        }

        // 保存到localStorage
        this.saveRecords();

        // 更新显示
        this.updateDisplay();

        return newRecord;
    }

    /**
     * 获取所有记录
     * @returns {Array} 记录数组
     */
    getRecords() {
        return [...this.records];
    }

    /**
     * 获取最近的记录
     * @param {number} count - 获取数量
     * @returns {Array} 记录数组
     */
    getRecentRecords(count = 10) {
        return this.records.slice(-count);
    }

    /**
     * 根据题目ID获取记录
     * @param {string} questionId - 题目ID
     * @returns {Array} 记录数组
     */
    getRecordsByQuestionId(questionId) {
        return this.records.filter(record => record.questionId === questionId);
    }

    /**
     * 根据状态获取记录
     * @param {string} status - 状态 (confirmed/modified/pending)
     * @returns {Array} 记录数组
     */
    getRecordsByStatus(status) {
        return this.records.filter(record => record.status === status);
    }

    /**
     * 清空所有记录
     */
    clearRecords() {
        this.records = [];
        this.saveRecords();
        this.updateDisplay();
        
    }

    /**
     * 导出记录为JSON
     * @returns {string} JSON字符串
     */
    exportToJSON() {
        const data = {
            exportTime: new Date().toISOString(),
            totalRecords: this.records.length,
            records: this.records
        };

        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, 'review-records.json', 'application/json');
        

        return jsonString;
    }

    /**
     * 导出记录为CSV
     * @returns {string} CSV字符串
     */
    exportToCSV() {
        if (this.records.length === 0) {
            // console.warn('⚠️ 没有记录可导出');
            return '';
        }

        // 表头
        const headers = [
            '记录ID',
            '题目ID',
            '题目标题',
            '原始分数',
            '调整后分数',
            '复核状态',
            '确认次数',
            '调整次数',
            '复核教师',
            '复核时间'
        ];

        // 数据行
        const rows = this.records.map(record => [
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

        // 构建CSV
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        this.downloadFile(csvContent, 'review-records.csv', 'text/csv');
        

        return csvContent;
    }

    /**
     * 生成PDF报告
     * @returns {Object} PDF对象
     */
    generatePDFReport() {
        

        // 检查是否有jsPDF
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
        doc.text('智学网AI阅卷助手 - 复核记录报告', 20, 20);

        // 导出时间
        doc.setFontSize(10);
        doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 20, 30);

        // 统计信息
        doc.setFontSize(12);
        doc.text('统计信息', 20, 45);
        doc.setFontSize(10);
        doc.text(`总记录数: ${this.records.length}`, 20, 55);
        doc.text(`已确认: ${this.getRecordsByStatus('confirmed').length}`, 20, 62);
        doc.text(`已调整: ${this.getRecordsByStatus('modified').length}`, 20, 69);
        doc.text(`待复核: ${this.getRecordsByStatus('pending').length}`, 20, 76);

        // 记录详情
        if (this.records.length > 0) {
            doc.setFontSize(12);
            doc.text('记录详情', 20, 90);

            let yPos = 100;
            const lineHeight = 7;

            this.records.forEach((record, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(9);
                doc.text(`[${index + 1}] 题目: ${record.questionTitle || record.questionId}`, 20, yPos);
                doc.text(`   分数: ${record.originalScore} → ${record.newScore}`, 20, yPos + 4);
                doc.text(`   状态: ${record.status} | 教师: ${record.reviewer}`, 20, yPos + 6);

                yPos += lineHeight;
            });
        }

        // 下载文件
        doc.save('review-records-report.pdf');
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
     * 加载记录
     */
    loadRecords() {
        
        try {
            const saved = localStorage.getItem('aiReviewRecords');
            if (saved) {
                this.records = JSON.parse(saved);
                
            }
        } catch (error) {
            // console.error('❌ 加载记录失败:', error);
        }
    }

    /**
     * 保存记录
     */
    saveRecords() {
        try {
            localStorage.setItem('aiReviewRecords', JSON.stringify(this.records));
            
        } catch (error) {
            // console.error('❌ 保存记录失败:', error);
        }
    }

    /**
     * 更新显示
     */
    updateDisplay() {
        const recordsList = document.getElementById('reviewRecordsList');
        if (!recordsList) return;

        if (this.records.length === 0) {
            recordsList.innerHTML = '<div class="text-center py-4 text-gray-500 text-xs">暂无复核记录</div>';
            return;
        }

        recordsList.innerHTML = this.records.slice(-10).reverse().map(record => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                <div>
                    <span class="text-gray-700">${record.questionTitle || record.questionId}</span>
                    <span class="text-gray-500 ml-2">${new Date(record.timestamp).toLocaleString()}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-blue-600">${record.newScore}分</span>
                    <span class="px-2 py-0.5 rounded text-xs ${this.getStatusClass(record.status)}">${this.getStatusText(record.status)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * 获取状态CSS类名
     * @param {string} status - 状态
     * @returns {string} CSS类名
     */
    getStatusClass(status) {
        const statusMap = {
            'confirmed': 'bg-green-100 text-green-700',
            'modified': 'bg-orange-100 text-orange-700',
            'pending': 'bg-gray-100 text-gray-700'
        };
        return statusMap[status] || 'bg-gray-100 text-gray-700';
    }

    /**
     * 获取状态文本
     * @param {string} status - 状态
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'confirmed': '已确认',
            'modified': '已调整',
            'pending': '待复核'
        };
        return statusMap[status] || '未知';
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        const total = this.records.length;
        const confirmed = this.getRecordsByStatus('confirmed').length;
        const modified = this.getRecordsByStatus('modified').length;
        const pending = this.getRecordsByStatus('pending').length;

        return {
            total,
            confirmed,
            modified,
            pending,
            confirmedRate: total > 0 ? (confirmed / total * 100).toFixed(1) : 0,
            modifiedRate: total > 0 ? (modified / total * 100).toFixed(1) : 0
        };
    }

    /**
     * 搜索记录
     * @param {string} keyword - 关键词
     * @returns {Array} 匹配的记录
     */
    searchRecords(keyword) {
        if (!keyword) return this.records;

        const lowerKeyword = keyword.toLowerCase();
        return this.records.filter(record => {
            return (
                (record.questionId && record.questionId.toLowerCase().includes(lowerKeyword)) ||
                (record.questionTitle && record.questionTitle.toLowerCase().includes(lowerKeyword)) ||
                (record.reviewer && record.reviewer.toLowerCase().includes(lowerKeyword))
            );
        });
    }

    /**
     * 按时间范围过滤记录
     * @param {Date} startDate - 开始时间
     * @param {Date} endDate - 结束时间
     * @returns {Array} 过滤后的记录
     */
    filterByDateRange(startDate, endDate) {
        return this.records.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= startDate && recordDate <= endDate;
        });
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
