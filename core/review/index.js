/**
 * 人工复核模块入口文件
 * @description 提供人工审核、分数调整和复核记录管理功能
 */

import { ReviewManager } from './review-manager.js';
import { ScoreAdjuster } from './score-adjuster.js';
import { ReviewRecords } from './review-records.js';

/**
 * 人工复核管理器
 */
class ReviewSystem {
    constructor() {
        this.reviewManager = new ReviewManager();
        this.scoreAdjuster = new ScoreAdjuster();
        this.reviewRecords = new ReviewRecords();
        this.isInitialized = false;
    }

    /**
     * 初始化人工复核模块
     */
    async initialize() {
        if (this.isInitialized) {
            
            return;
        }

        try {
            await Promise.all([
                this.reviewManager.initialize(),
                this.scoreAdjuster.initialize(),
                this.reviewRecords.initialize()
            ]);

            this.isInitialized = true;
            
        } catch (error) {
            // console.error('人工复核模块初始化失败:', error);
            throw error;
        }
    }

    /**
     * 提交人工审核
     */
    async submitReview(reviewData) {
        await this.ensureInitialized();
        return this.reviewManager.submit(reviewData);
    }

    /**
     * 调整分数
     */
    async adjustScore(originalScore, adjustment, reason) {
        await this.ensureInitialized();
        return this.scoreAdjuster.adjust(originalScore, adjustment, reason);
    }

    /**
     * 获取复核记录
     */
    async getReviewRecords(filters = {}) {
        await this.ensureInitialized();
        return this.reviewRecords.getRecords(filters);
    }

    /**
     * 获取待审核列表
     */
    async getPendingReviews() {
        await this.ensureInitialized();
        return this.reviewManager.getPendingReviews();
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
const reviewSystem = new ReviewSystem();

// 导出模块接口
export {
    ReviewSystem,
    reviewSystem,
    ReviewManager,
    ScoreAdjuster,
    ReviewRecords
};
