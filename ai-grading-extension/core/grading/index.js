/**
 * 智能阅卷模块入口文件
 * @description 提供AI评分、进度跟踪和分数同步功能
 */

import { AIScorer } from './ai-scorer.js';
import { ProgressTracker } from './progress-tracker.js';
import { ScoreSyncEngine } from './score-sync-engine.js';

/**
 * 智能阅卷管理器
 */
class GradingManager {
    constructor() {
        this.aiScorer = new AIScorer();
        this.progressTracker = new ProgressTracker();
        this.scoreSyncEngine = new ScoreSyncEngine();
        this.isInitialized = false;
    }

    /**
     * 初始化智能阅卷模块
     */
    async initialize() {
        if (this.isInitialized) {
            
            return;
        }

        try {
            await Promise.all([
                this.aiScorer.initialize(),
                this.progressTracker.initialize(),
                this.scoreSyncEngine.initialize()
            ]);

            this.isInitialized = true;
            
        } catch (error) {
            // console.error('智能阅卷模块初始化失败:', error);
            throw error;
        }
    }

    /**
     * AI评分
     */
    async scoreAnswer(question, answer, rubric) {
        await this.ensureInitialized();
        return this.aiScorer.score(question, answer, rubric);
    }

    /**
     * 批量评分
     */
    async batchScore(answers, options = {}) {
        await this.ensureInitialized();
        return this.aiScorer.batchScore(answers, options);
    }

    /**
     * 获取评分进度
     */
    getProgress() {
        return this.progressTracker.getProgress();
    }

    /**
     * 同步分数
     */
    async syncScores(scores) {
        await this.ensureInitialized();
        return this.scoreSyncEngine.sync(scores);
    }

    /**
     * 确保模块已初始化
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }
}

// 创建全局实例
const gradingManager = new GradingManager();

// 导出模块接口
export {
    GradingManager,
    gradingManager,
    AIScorer,
    ProgressTracker,
    ScoreSyncEngine
};
