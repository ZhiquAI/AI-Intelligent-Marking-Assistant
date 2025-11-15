// ============================================================================
// 智学网AI阅卷助手 - 复核管理模块
// 100%还原原HTML中的复核管理逻辑
// ============================================================================

export class ReviewManager {
    constructor() {
        this.reviewData = this.initializeReviewData();
        this.currentQuestionId = 'q_20241109_001';
        this.totalQuestions = 15;
        this.lastReviewer = 'teacher_1';
        
    }

    /**
     * 初始化复核数据
     * @returns {Object} 复核数据对象
     */
    initializeReviewData() {
        const questions = {};
        for (let i = 1; i <= 15; i++) {
            const questionId = `q_20241109_${i.toString().padStart(3, '0')}`;
            questions[questionId] = {
                questionId: questionId,
                questionTitle: `题目 ${i}`,
                currentScore: 0,
                aiScore: 0,
                teacherScore: 0,
                status: 'pending', // pending/confirmed/modified
                timestamp: Date.now(),
                reviewRecord: {
                    confirmations: 0,
                    modifications: 0,
                    lastReviewer: this.lastReviewer
                }
            };
        }

        return {
            questions: questions,
            currentQuestionId: 'q_20241109_001',
            totalQuestions: 15,
            stats: {
                totalReviewed: 0,
                pendingReview: 15,
                modifiedCount: 0
            }
        };
    }

    /**
     * 从localStorage加载复核数据
     */
    loadReviewData() {
        
        const saved = localStorage.getItem('aiReviewData') || localStorage.getItem('reviewData');
        if (saved) {
            try {
                this.reviewData = JSON.parse(saved);
                // 确保totalQuestions字段存在
                if (!this.reviewData.totalQuestions) {
                    this.reviewData.totalQuestions = Object.keys(this.reviewData.questions).length;
                }
                
            } catch (error) {
                // console.error('❌ 复核数据加载失败:', error);
            }
        }
    }

    /**
     * 保存复核数据到localStorage
     */
    saveReviewData() {
        
        try {
            localStorage.setItem('aiReviewData', JSON.stringify(this.reviewData));
            this.showToast('success', '保存成功', '复核进度已自动保存');
        } catch (error) {
            // console.error('❌ 复核数据保存失败:', error);
            this.showToast('error', '保存失败', '复核数据保存失败');
        }
    }

    /**
     * 从智学网页面智能提取当前题目信息
     * @returns {Object} 题目信息
     */
    getCurrentQuestionInfo() {
        // 提取题目ID（从URL或页面元素）
        const questionId = this.extractQuestionId();

        // 提取题目内容（尝试多种选择器）
        const questionTitleSelectors = [
            '.question-title',
            '.question-text h3',
            '.question-header h3',
            'h3.question',
            '.topic-title',
            '.subject-title',
            '[class*="title"]'
        ];

        let questionTitle = '题目';
        for (const selector of questionTitleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerText.trim()) {
                questionTitle = element.innerText.trim();
                break;
            }
        }

        // 提取当前得分（尝试多种选择器）
        const scoreSelectors = [
            'input[name*="score"]',
            'input[id*="score"]',
            '.score-input input',
            '.score-input',
            '[class*="score"] input'
        ];

        let currentScore = 0;
        for (const selector of scoreSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const value = element.value || element.getAttribute('value');
                const score = parseFloat(value);
                if (!isNaN(score)) {
                    currentScore = score;
                    break;
                }
            }
        }

        return {
            questionId,
            questionTitle,
            currentScore,
            timestamp: Date.now()
        };
    }

    /**
     * 提取题目ID的辅助函数
     * @returns {string} 题目ID
     */
    extractQuestionId() {
        // 方法1: 尝试从URL中提取
        const urlParams = new URLSearchParams(window.location.search);
        const qid = urlParams.get('qid') || urlParams.get('questionId') || urlParams.get('id');

        if (qid) return `q_${qid}`;

        // 方法2: 尝试从页面元素中提取
        const selectors = [
            '[data-question-id]',
            '.question-id',
            '#question-id',
            '.qid',
            '[id*="question"]',
            '[class*="question"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const value = element.getAttribute('data-question-id') ||
                             element.innerText.trim() ||
                             element.value;
                if (value) {
                    return `q_${value}`;
                }
            }
        }

        // 方法3: 生成基于当前时间和页面的唯一ID
        return `q_${Date.now()}`;
    }

    /**
     * 更新复核界面显示
     */
    updateReviewInterface() {
        
        const question = this.reviewData.questions[this.currentQuestionId];
        if (!question) return;

        // 获取智学网页面的当前题目信息
        const currentInfo = this.getCurrentQuestionInfo();

        // 更新题目信息
        this.updateElementText('reviewQuestionTitle', question.questionTitle);
        this.updateElementText('reviewQuestionId', question.questionId);
        this.updateElementText('reviewGradingTime', this.formatTime(question.timestamp));

        // 更新复核状态
        this.updateElementText('ai-suggestion', `${question.aiScore}分`);
        this.updateElementText('current-score', `${question.currentScore}分`);

        // 更新分数输入框
        const scoreInput = document.getElementById('score-input');
        if (scoreInput) {
            scoreInput.value = question.currentScore;
            scoreInput.max = 100; // 默认满分100分
        }

        // 更新复核次数
        const reviewCountElement = document.getElementById('review-count');
        if (reviewCountElement) {
            reviewCountElement.textContent = `${question.reviewRecord.confirmations + question.reviewRecord.modifications}次`;
        }

        // 更新复核记录
        this.updateReviewHistory(question);

        // 更新按钮状态
        this.updateReviewButtonStates();

        // 更新统计信息
        this.updateReviewStats();
    }

    /**
     * 更新元素文本
     * @param {string} elementId - 元素ID
     * @param {string} text - 文本内容
     */
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * 格式化时间
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的时间
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 更新复核记录
     * @param {Object} question - 题目对象
     */
    updateReviewHistory(question) {
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return;

        reviewList.innerHTML = '';

        const history = [
            { label: '确认次数', value: question.reviewRecord.confirmations },
            { label: '调整次数', value: question.reviewRecord.modifications },
            { label: '复核教师', value: question.reviewRecord.lastReviewer }
        ];

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'py-1 text-xs text-gray-600';
            li.textContent = `${item.label}: ${item.value}`;
            reviewList.appendChild(li);
        });
    }

    /**
     * 更新复核统计
     */
    updateReviewStats() {
        const questions = Object.values(this.reviewData.questions);
        const total = this.reviewData.totalQuestions || questions.length;
        const pending = questions.filter(q => q.status === 'pending').length;
        const completed = questions.filter(q => q.status === 'confirmed' || q.status === 'modified').length;
        const modified = questions.filter(q => q.status === 'modified').length;

        this.reviewData.stats.totalReviewed = completed;
        this.reviewData.stats.pendingReview = pending;
        this.reviewData.stats.modifiedCount = modified;

        // 更新进度条文本
        this.updateElementText('reviewProgressText', `${completed}/${total}`);

        // 更新进度条百分比
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        this.updateElementText('reviewProgressPercentage', `${percentage}%`);

        // 更新进度条宽度
        const progressBar = document.getElementById('reviewProgressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;

            // 根据进度设置不同的颜色
            if (percentage === 100) {
                progressBar.className = 'bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-1';
            } else if (percentage >= 50) {
                progressBar.className = 'bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-1';
            } else {
                progressBar.className = 'bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-1';
            }
        }

        
    }

    /**
     * 更新按钮状态
     */
    updateReviewButtonStates() {
        const question = this.reviewData.questions[this.currentQuestionId];
        if (!question) return;

        const skipBtn = document.getElementById('skip-review');
        const saveBtn = document.getElementById('save-review');

        // 按钮逻辑：跳过复核和保存记录按钮始终可用
        if (skipBtn) {
            skipBtn.disabled = false;
        }
        if (saveBtn) {
            saveBtn.disabled = false;
        }

        // 按钮样式
        [skipBtn, saveBtn].forEach(btn => {
            if (btn) {
                if (btn.disabled) {
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        });
    }

    /**
     * 确认分数
     * @returns {boolean} 是否成功
     */
    confirmScore() {
        
        const question = this.reviewData.questions[this.currentQuestionId];
        if (!question) return false;

        if (question.status === 'pending') {
            // 从分数输入框获取分数
            const scoreInput = document.getElementById('score-input');
            if (scoreInput) {
                const score = parseFloat(scoreInput.value);
                const maxScore = 100; // 默认满分100分

                if (!isNaN(score) && score >= 0 && score <= maxScore) {
                    question.currentScore = score;
                } else {
                    if (isNaN(score) || score < 0) {
                        this.showToast('error', '输入无效', '请输入有效的分数');
                    } else if (score > maxScore) {
                        this.showToast('error', '输入无效', `分数不能超过 ${maxScore} 分`);
                    }
                    return false;
                }
            }

            question.status = 'confirmed';
            question.teacherScore = question.currentScore;
            question.reviewRecord.confirmations++;
            question.timestamp = Date.now();

            this.saveReviewData();
            this.updateReviewInterface();

            this.showToast('success', '确认成功', `题目 ${question.questionId} 已确认`);

            return true;
        } else {
            this.showToast('warning', '提示', '该题目已完成复核');
            return false;
        }
    }

    /**
     * 修改分数
     * @returns {boolean} 是否成功
     */
    modifyScore() {
        
        const question = this.reviewData.questions[this.currentQuestionId];
        if (!question) return false;

        // 从分数输入框获取分数
        const scoreInput = document.getElementById('score-input');
        if (scoreInput) {
            const score = parseFloat(scoreInput.value);
            const maxScore = 100; // 默认满分100分

            if (!isNaN(score) && score >= 0 && score <= maxScore) {
                question.currentScore = score;
                question.teacherScore = score;
                question.reviewRecord.modifications++;
                question.timestamp = Date.now();
                question.status = 'modified';

                this.saveReviewData();
                this.updateReviewInterface();

                this.showToast('success', '修改成功', `题目 ${question.questionId} 分数已调整为 ${score} 分`);
                return true;
            } else {
                if (isNaN(score) || score < 0) {
                    this.showToast('error', '输入无效', '请输入有效的分数');
                } else if (score > maxScore) {
                    this.showToast('error', '输入无效', `分数不能超过 ${maxScore} 分`);
                }
                return false;
            }
        }

        return false;
    }

    /**
     * 跳转到上一题
     */
    prevQuestion() {
        
        const questionIds = Object.keys(this.reviewData.questions);
        const currentIndex = questionIds.indexOf(this.currentQuestionId);

        if (currentIndex > 0) {
            this.currentQuestionId = questionIds[currentIndex - 1];
            this.updateReviewInterface();
            this.showToast('info', '切换成功', `已跳转到上一题: ${this.currentQuestionId}`);
        } else {
            this.showToast('warning', '提示', '已经是第一题');
        }
    }

    /**
     * 跳转到下一题
     */
    nextQuestion() {
        
        const questionIds = Object.keys(this.reviewData.questions);
        const currentIndex = questionIds.indexOf(this.currentQuestionId);

        if (currentIndex < questionIds.length - 1) {
            this.currentQuestionId = questionIds[currentIndex + 1];
            this.updateReviewInterface();
            this.showToast('info', '切换成功', `已跳转到下一题: ${this.currentQuestionId}`);
        } else {
            this.showToast('success', '提示', '已经是最后一题');
        }
    }

    /**
     * 跳过复核
     */
    skipReview() {
        
        const question = this.reviewData.questions[this.currentQuestionId];
        if (!question) return;

        question.timestamp = Date.now();
        this.saveReviewData();

        this.showToast('info', '已跳过', `题目 ${question.questionId} 已跳过复核`);
    }

    /**
     * 保存复核记录
     */
    saveReview() {
        
        const question = this.reviewData.questions[this.currentQuestionId];
        if (!question) return;

        question.timestamp = Date.now();
        this.saveReviewData();

        this.showToast('success', '保存成功', `题目 ${question.questionId} 复核记录已保存`);
    }

    /**
     * 获取当前复核状态
     * @returns {Object} 复核状态
     */
    getStatus() {
        return {
            currentQuestionId: this.currentQuestionId,
            totalQuestions: this.totalQuestions,
            stats: this.reviewData.stats,
            currentQuestion: this.reviewData.questions[this.currentQuestionId]
        };
    }

    /**
     * 设置当前题目
     * @param {string} questionId - 题目ID
     */
    setCurrentQuestion(questionId) {
        if (this.reviewData.questions[questionId]) {
            this.currentQuestionId = questionId;
            this.updateReviewInterface();
        } else {
            // console.error('❌ 题目不存在:', questionId);
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
}
