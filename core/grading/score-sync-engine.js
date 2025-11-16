// ============================================================================
// 智学网AI阅卷助手 - 分数同步引擎
// 100%还原原HTML中的分数同步逻辑
// ============================================================================

export class ScoreSyncEngine {
    constructor() {
        this.currentScore = 85;
        this.maxScore = 100;
        this.isAutoSubmit = false;
        this.scoreInput = null;
        this.lastSyncTime = null;
        this.syncInterval = null;
        this.isMonitoring = false;
        this.observers = [];
        this.init();
        
    }

    init() {
        
        this.detectScoreElements();
        this.startMonitoring();
    }

    /**
     * 智能识别智学网的得分框元素
     */
    detectScoreElements() {
        const possibleSelectors = [
            'input[type="number"][class*="score"]',
            'input[class*="grade"]',
            'input[id*="score"]',
            '.score-input input',
            '.grade-box input',
            'input[name*="score"]',
            'input[placeholder*="分"]',
            '.exam-grade-box input',
            '.answer-score input',
            'input[maxlength="3"]'
        ];

        for (const selector of possibleSelectors) {
            const element = document.querySelector(selector);
            if (element && this.isScoreElement(element)) {
                this.scoreInput = element;
                
                return true;
            }
        }

        // console.warn('⚠️ 未找到得分框元素，模拟模式下将显示提示');
        return false;
    }

    /**
     * 判断元素是否为得分框
     * @param {Element} element - DOM元素
     * @returns {boolean} 是否为得分框
     */
    isScoreElement(element) {
        if (!element || element.tagName !== 'INPUT') return false;

        // 检查属性
        const attrs = {
            type: element.type,
            max: element.max,
            min: element.min,
            placeholder: element.placeholder,
            className: element.className,
            id: element.id,
            name: element.name
        };

        // 判断逻辑
        const isNumberInput = attrs.type === 'number';
        const hasScoreKeyword = /score|grade|分|得分/i.test(attrs.className + attrs.id + attrs.name + attrs.placeholder);
        const hasReasonableRange = parseInt(attrs.max) <= 200 && parseInt(attrs.min) >= 0;

        return isNumberInput && (hasScoreKeyword || hasReasonableRange);
    }

    /**
     * 同步分数到智学网
     * @param {number} score - 分数
     * @param {boolean} autoSubmit - 是否自动提交
     */
    syncScore(score, autoSubmit = false) {
        

        this.currentScore = score;
        this.isAutoSubmit = autoSubmit;
        this.lastSyncTime = Date.now();

        if (this.scoreInput) {
            this.syncToInput(score, autoSubmit);
        } else {
            this.showSimulationMode(score);
        }

        // 通知观察者
        this.notifyObservers('scoreSynced', { score, autoSubmit, timestamp: this.lastSyncTime });
    }

    /**
     * 同步分数到输入框
     * @param {number} score - 分数
     * @param {boolean} autoSubmit - 是否自动提交
     */
    syncToInput(score, autoSubmit) {
        try {
            // 设置分数
            this.scoreInput.value = score;

            // 触发change事件
            const event = new Event('change', { bubbles: true });
            this.scoreInput.dispatchEvent(event);

            // 触发input事件
            const inputEvent = new Event('input', { bubbles: true });
            this.scoreInput.dispatchEvent(inputEvent);

            

            // 如果启用自动提交，延迟提交
            if (autoSubmit) {
                setTimeout(() => {
                    this.autoSubmit();
                }, 500);
            }
        } catch (error) {
            // console.error('❌ 分数同步失败:', error);
        }
    }

    /**
     * 自动提交成绩
     */
    autoSubmit() {
        const submitButtons = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.submit-btn',
            '#submitBtn',
            '[onclick*="submit"]',
            'button:contains("提交")',
            'button:contains("保存")'
        ];

        for (const selector of submitButtons) {
            const button = document.querySelector(selector);
            if (button && !button.disabled) {
                
                button.click();
                this.notifyObservers('autoSubmitted', { score: this.currentScore });
                return true;
            }
        }

        // console.warn('⚠️ 未找到提交按钮');
        return false;
    }

    /**
     * 显示模拟模式提示
     * @param {number} score - 分数
     */
    showSimulationMode(score) {
        const message = `模拟模式：分数 ${score} 已准备好，请在智学网中手动输入`;

        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        toast.innerHTML = `
            <i data-lucide="info" class="w-4 h-4"></i>
            <span>${message}</span>
            <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.remove()">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        document.body.appendChild(toast);

        // 初始化图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 3秒后自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);

        
    }

    /**
     * 开始监控分数变化
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.syncInterval = setInterval(() => {
            this.checkScoreChange();
        }, 1000);

        
    }

    /**
     * 停止监控分数变化
     */
    stopMonitoring() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.isMonitoring = false;
        
    }

    /**
     * 检查分数变化
     */
    checkScoreChange() {
        if (!this.scoreInput) return;

        const currentValue = parseInt(this.scoreInput.value) || 0;
        if (currentValue !== this.currentScore) {
            
            this.currentScore = currentValue;
            this.notifyObservers('scoreChanged', { score: currentValue });
        }
    }

    /**
     * 添加观察者
     * @param {string} event - 事件名
     * @param {Function} callback - 回调函数
     */
    addObserver(event, callback) {
        if (!this.observers[event]) {
            this.observers[event] = [];
        }
        this.observers[event].push(callback);
    }

    /**
     * 移除观察者
     * @param {string} event - 事件名
     * @param {Function} callback - 回调函数
     */
    removeObserver(event, callback) {
        if (this.observers[event]) {
            this.observers[event] = this.observers[event].filter(cb => cb !== callback);
        }
    }

    /**
     * 通知观察者
     * @param {string} event - 事件名
     * @param {Object} data - 数据
     */
    notifyObservers(event, data) {
        if (this.observers[event]) {
            this.observers[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    // console.error('观察者回调错误:', error);
                }
            });
        }
    }

    /**
     * 重新检测得分框
     */
    reDetectScoreElements() {
        
        this.detectScoreElements();
    }

    /**
     * 获取当前状态
     * @returns {Object} 状态对象
     */
    getStatus() {
        return {
            currentScore: this.currentScore,
            maxScore: this.maxScore,
            isAutoSubmit: this.isAutoSubmit,
            hasScoreInput: !!this.scoreInput,
            isMonitoring: this.isMonitoring,
            lastSyncTime: this.lastSyncTime
        };
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.stopMonitoring();
        this.observers = [];
        this.scoreInput = null;
        
    }
}
