// ============================================================================
// 智学网AI阅卷助手 - 进度跟踪模块
// 100%还原原HTML中的进度管理逻辑
// ============================================================================

export class ProgressTracker {
    constructor() {
        this.totalPapers = 892;
        this.todayPapers = 23;
        this.averageTime = 32; // 秒
        this.accuracy = 98; // 百分比
        this.confidence = 92; // 百分比
        this.currentProgress = 0;
        this.totalProgress = 15;
        this.startTime = null;
        this.pauseTime = null;
        this.elapsedTime = 0;
        this.reviewRecords = [];
        this.isPaused = false;
        
    }

    /**
     * 开始阅卷
     */
    startGrading() {
        
        this.startTime = Date.now();
        this.isPaused = false;
        this.updateProgress();
        this.showToast('info', '开始阅卷', 'AI正在分析学生答题卡...');
    }

    /**
     * 暂停阅卷
     */
    pauseGrading() {
        if (this.isPaused) {
            
            this.isPaused = false;
            this.startTime = Date.now() - this.elapsedTime;
            this.showToast('info', '继续阅卷', '已恢复阅卷');
        } else {
            
            this.isPaused = true;
            this.pauseTime = Date.now();
            this.elapsedTime = this.pauseTime - this.startTime;
            this.showToast('warning', '已暂停', '阅卷已暂停，可随时继续');
        }
    }

    /**
     * 完成阅卷
     * @param {Object} result - 阅卷结果
     * @returns {Object} 完成的记录
     */
    completeGrading(result) {
        
        const endTime = Date.now();
        const duration = this.startTime ? (endTime - this.startTime) / 1000 : 0;

        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            student: this.generateStudentName(),
            score: result.score,
            maxScore: result.maxScore,
            confidence: result.confidence,
            duration: Math.round(duration),
            dimensions: result.dimensions,
            reasoning: result.reasoning,
            model: result.model || '双模型'
        };

        this.reviewRecords.push(record);
        this.todayPapers++;
        this.currentProgress++;

        this.updateStatistics();
        this.updateProgress();

        this.showToast('success', '阅卷完成', `得分：${result.score}/${result.maxScore}，智学网将自动跳转下一份`);

        return record;
    }

    /**
     * 更新进度
     */
    updateProgress() {
        const percentage = Math.round((this.currentProgress / this.totalProgress) * 100);

        // 更新UI元素
        this.updateUI('reviewProgressText', `${this.currentProgress}/${this.totalProgress}`);
        this.updateUI('reviewProgressPercentage', `${percentage}%`);
        this.updateUI('reviewProgressBar', 'width', `${percentage}%`);

        
    }

    /**
     * 更新统计数据
     */
    updateStatistics() {
        // 更新评阅份数
        this.updateUI('totalPapers', this.totalPapers);
        this.updateUI('todayPapers', this.todayPapers);

        // 更新平均分
        const averageScore = this.calculateAverageScore();
        this.updateUI('averageScore', averageScore.toFixed(1));

        // 更新得分率
        const scoreRate = (averageScore / this.maxScore) * 100;
        this.updateUI('scoreRate', `${scoreRate.toFixed(1)}%`);

        // 更新及格率
        const passRate = this.calculatePassRate();
        this.updateUI('passRate', `${passRate.toFixed(1)}%`);
    }

    /**
     * 计算平均分
     * @returns {number} 平均分
     */
    calculateAverageScore() {
        if (this.reviewRecords.length === 0) {
            return 85.6; // 默认值
        }

        const total = this.reviewRecords.reduce((sum, record) => sum + record.score, 0);
        return total / this.reviewRecords.length;
    }

    /**
     * 计算及格率
     * @returns {number} 及格率百分比
     */
    calculatePassRate() {
        if (this.reviewRecords.length === 0) {
            return 90.2; // 默认值
        }

        const passCount = this.reviewRecords.filter(record => record.score >= 60).length;
        return (passCount / this.reviewRecords.length) * 100;
    }

    /**
     * 生成学生姓名
     * @returns {string} 学生姓名
     */
    generateStudentName() {
        const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];
        const index = Math.floor(Math.random() * names.length);
        return names[index];
    }

    /**
     * 获取实时统计
     * @returns {Object} 实时统计数据
     */
    getRealTimeStats() {
        return {
            todayPapers: this.todayPapers,
            averageTime: this.averageTime,
            accuracy: this.accuracy,
            confidence: this.confidence
        };
    }

    /**
     * 获取阅卷记录
     * @returns {Array} 阅卷记录数组
     */
    getReviewRecords() {
        return this.reviewRecords;
    }

    /**
     * 刷新阅卷记录
     */
    refreshReviewRecords() {
        
        this.loadReviewRecords();
        this.showToast('info', '刷新完成', '评分记录已更新');
    }

    /**
     * 加载阅卷记录
     */
    loadReviewRecords() {
        const recordsList = document.getElementById('reviewRecordsList');
        if (!recordsList) return;

        if (this.reviewRecords.length === 0) {
            recordsList.innerHTML = '<div class="text-center py-4 text-gray-500 text-xs">暂无评分记录</div>';
            return;
        }

        recordsList.innerHTML = this.reviewRecords.map(record => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                <span class="text-gray-700">${record.student}</span>
                <span class="font-bold text-blue-600">${record.score}分</span>
                <span class="text-gray-500">${new Date(record.timestamp).toLocaleTimeString()}</span>
            </div>
        `).join('');
    }

    /**
     * 更新UI元素
     * @param {string} elementId - 元素ID
     * @param {string} value - 值
     * @param {string} attribute - 属性名 (可选)
     */
    updateUI(elementId, value, attribute = 'textContent') {
        const element = document.getElementById(elementId);
        if (element) {
            element[attribute] = value;
        }
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

    /**
     * 获取进度详情
     * @returns {Object} 进度详情
     */
    getProgressDetails() {
        return {
            current: this.currentProgress,
            total: this.totalProgress,
            percentage: Math.round((this.currentProgress / this.totalProgress) * 100),
            isPaused: this.isPaused,
            elapsedTime: this.elapsedTime
        };
    }

    /**
     * 重置进度
     */
    reset() {
        
        this.currentProgress = 0;
        this.reviewRecords = [];
        this.startTime = null;
        this.isPaused = false;
        this.elapsedTime = 0;
        this.updateProgress();
    }

    /**
     * 设置总进度
     * @param {number} total - 总数
     */
    setTotalProgress(total) {
        this.totalProgress = total;
        
    }
}
