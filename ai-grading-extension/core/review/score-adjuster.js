// ============================================================================
// 智学网AI阅卷助手 - 分数调整模块
// 100%还原原HTML中的分数调整逻辑
// ============================================================================

export class ScoreAdjuster {
    constructor() {
        this.adjustmentHistory = [];
        this.isAdjusting = false;
        
    }

    /**
     * 打开分数调整模态框
     * @param {Object} scoreData - 分数数据
     */
    openAdjustmentModal(scoreData) {
        
        this.isAdjusting = true;

        const modal = document.getElementById('scoreAdjustmentModal');
        if (!modal) {
            // console.error('❌ 未找到分数调整模态框');
            return;
        }

        // 生成调整项目
        this.generateAdjustmentItems(scoreData);

        // 显示模态框
        this.showModal('scoreAdjustmentModal');

        // 绑定事件
        this.bindAdjustmentEvents();
    }

    /**
     * 生成调整项目
     * @param {Object} scoreData - 分数数据
     */
    generateAdjustmentItems(scoreData) {
        const container = document.getElementById('scoreAdjustmentList');
        if (!container) return;

        // 默认维度数据
        const defaultDimensions = [
            { name: '观点明确', score: 28, maxScore: 30, color: 'blue' },
            { name: '史实准确', score: 25, maxScore: 30, color: 'green' },
            { name: '论述充分', score: 22, maxScore: 25, color: 'purple' },
            { name: '语言表达', score: 10, maxScore: 15, color: 'orange' }
        ];

        const dimensions = scoreData.dimensions || defaultDimensions;

        container.innerHTML = dimensions.map((dim, index) => {
            const colorClass = this.getColorClass(dim.color);
            return `
                <div class="border border-gray-200 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">${dim.name}</span>
                        <span class="text-sm font-bold text-gray-900" id="dimension-score-${index}">${dim.score}/${dim.maxScore}</span>
                    </div>
                    <div class="relative">
                        <input
                            type="range"
                            id="dimension-slider-${index}"
                            min="0"
                            max="${dim.maxScore}"
                            value="${dim.score}"
                            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            data-dimension="${dim.name}"
                            data-index="${index}"
                            oninput="updateDimensionScore(${index}, '${dim.name}', ${dim.maxScore})"
                        >
                        <div class="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0</span>
                            <span>${dim.maxScore}</span>
                        </div>
                    </div>
                    <div class="mt-2 text-xs text-gray-600">
                        <span class="font-medium ${colorClass}">${dim.score}</span> / ${dim.maxScore} 分
                    </div>
                </div>
            `;
        }).join('');

        // 更新总分
        this.updateAdjustedTotalScore();
    }

    /**
     * 更新维度分数
     * @param {number} index - 维度索引
     * @param {string} name - 维度名称
     * @param {number} maxScore - 最大分数
     */
    updateDimensionScore(index, name, maxScore) {
        const slider = document.getElementById(`dimension-slider-${index}`);
        const scoreElement = document.getElementById(`dimension-score-${index}`);

        if (!slider || !scoreElement) return;

        const score = parseInt(slider.value);
        scoreElement.textContent = `${score}/${maxScore}`;

        // 更新显示
        const parentDiv = slider.closest('.border');
        if (parentDiv) {
            const textElement = parentDiv.querySelector('.text-xs.text-gray-600 span');
            if (textElement) {
                textElement.textContent = score;
            }
        }

        // 更新总分
        this.updateAdjustedTotalScore();

        // 记录调整历史
        this.recordAdjustment(name, score, maxScore);
    }

    /**
     * 记录调整历史
     * @param {string} dimension - 维度名称
     * @param {number} score - 分数
     * @param {number} maxScore - 最大分数
     */
    recordAdjustment(dimension, score, maxScore) {
        const adjustment = {
            dimension: dimension,
            score: score,
            maxScore: maxScore,
            timestamp: Date.now()
        };
        this.adjustmentHistory.push(adjustment);
        
    }

    /**
     * 更新调整后总分
     */
    updateAdjustedTotalScore() {
        const sliders = document.querySelectorAll('[id^="dimension-slider-"]');
        let totalScore = 0;

        sliders.forEach(slider => {
            totalScore += parseInt(slider.value) || 0;
        });

        const totalScoreElement = document.getElementById('adjustedTotalScore');
        if (totalScoreElement) {
            totalScoreElement.textContent = totalScore;
        }

        
    }

    /**
     * 确认调整
     */
    confirmAdjustment() {
        

        // 获取所有维度分数
        const dimensions = [];
        const sliders = document.querySelectorAll('[id^="dimension-slider-"]');

        sliders.forEach(slider => {
            const name = slider.getAttribute('data-dimension');
            const score = parseInt(slider.value);
            const maxScore = parseInt(slider.max);

            dimensions.push({
                name: name,
                score: score,
                maxScore: maxScore
            });
        });

        // 计算总分
        const totalScore = dimensions.reduce((sum, dim) => sum + dim.score, 0);

        // 构建结果
        const result = {
            dimensions: dimensions,
            totalScore: totalScore,
            adjustmentHistory: this.adjustmentHistory,
            timestamp: Date.now()
        };

        // 关闭模态框
        this.closeAdjustmentModal();

        // 通知回调
        if (this.onAdjustmentConfirm) {
            this.onAdjustmentConfirm(result);
        }

        this.showToast('success', '调整完成', `分数已调整为 ${totalScore} 分`);
    }

    /**
     * 取消调整
     */
    cancelAdjustment() {
        
        this.closeAdjustmentModal();
    }

    /**
     * 关闭分数调整模态框
     */
    closeAdjustmentModal() {
        this.isAdjusting = false;
        this.hideModal('scoreAdjustmentModal');
    }

    /**
     * 绑定调整事件
     */
    bindAdjustmentEvents() {
        // 确认调整按钮
        const confirmBtn = document.getElementById('confirmScoreAdjustBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmAdjustment();
        }

        // 取消调整按钮
        const cancelBtn = document.getElementById('cancelScoreAdjustBtn');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.cancelAdjustment();
        }

        // 关闭按钮
        const closeBtn = document.getElementById('closeScoreModalBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.cancelAdjustment();
        }

        // 模态框背景点击
        const modal = document.getElementById('scoreAdjustmentModal');
        if (modal) {
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.onclick = () => this.cancelAdjustment();
            }
        }

        // ESC键关闭
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                this.cancelAdjustment();
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
    }

    /**
     * 显示模态框
     * @param {string} modalId - 模态框ID
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                const backdrop = modal.querySelector('.modal-backdrop');
                const content = modal.querySelector('.modal-content');
                if (backdrop) backdrop.classList.add('opacity-100');
                if (content) {
                    content.classList.add('scale-100', 'opacity-100');
                    content.classList.remove('scale-95', 'opacity-0');
                }
            }, 10);
        }
    }

    /**
     * 隐藏模态框
     * @param {string} modalId - 模态框ID
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const backdrop = modal.querySelector('.modal-backdrop');
            const content = modal.querySelector('.modal-content');
            if (backdrop) backdrop.classList.remove('opacity-100');
            if (content) {
                content.classList.remove('scale-100', 'opacity-100');
                content.classList.add('scale-95', 'opacity-0');
            }
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }

    /**
     * 获取颜色类名
     * @param {string} color - 颜色名
     * @returns {string} CSS类名
     */
    getColorClass(color) {
        const colorMap = {
            blue: 'text-blue-600',
            green: 'text-green-600',
            purple: 'text-purple-600',
            orange: 'text-orange-600'
        };
        return colorMap[color] || 'text-gray-600';
    }

    /**
     * 设置确认回调
     * @param {Function} callback - 回调函数
     */
    setOnAdjustmentConfirm(callback) {
        this.onAdjustmentConfirm = callback;
    }

    /**
     * 获取调整历史
     * @returns {Array} 调整历史数组
     */
    getAdjustmentHistory() {
        return this.adjustmentHistory;
    }

    /**
     * 清空调整历史
     */
    clearAdjustmentHistory() {
        this.adjustmentHistory = [];
        
    }

    /**
     * 获取当前调整状态
     * @returns {Object} 状态对象
     */
    getStatus() {
        return {
            isAdjusting: this.isAdjusting,
            adjustmentCount: this.adjustmentHistory.length
        };
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

// 全局函数 - 在HTML中调用
window.updateDimensionScore = function(index, name, maxScore) {
    // 这个函数会在窗口级别暴露
    if (window.scoreAdjusterInstance) {
        window.scoreAdjusterInstance.updateDimensionScore(index, name, maxScore);
    }
};
