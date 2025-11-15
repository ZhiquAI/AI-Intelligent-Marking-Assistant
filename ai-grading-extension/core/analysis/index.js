/**
 * 数据分析模块入口文件
 * @description 提供成绩统计分析、图表渲染和数据导出功能
 */

import { ChartRenderer } from './chart-renderer.js';
import { Statistics } from './statistics.js';
import { ExportManager } from './export-manager.js';

/**
 * 数据分析管理器
 */
class AnalysisManager {
    constructor() {
        this.chartRenderer = new ChartRenderer();
        this.statistics = new Statistics();
        this.exportManager = new ExportManager();
        this.isInitialized = false;
    }

    /**
     * 初始化数据分析模块
     */
    async initialize() {
        if (this.isInitialized) {
            
            return;
        }

        try {
            await Promise.all([
                this.chartRenderer.initialize(),
                this.statistics.initialize(),
                this.exportManager.initialize()
            ]);

            this.isInitialized = true;
            
        } catch (error) {
            // console.error('数据分析模块初始化失败:', error);
            throw error;
        }
    }

    /**
     * 获取统计信息
     */
    async getStatistics(scores) {
        await this.ensureInitialized();
        return this.statistics.calculate(scores);
    }

    /**
     * 渲染图表
     */
    async renderChart(data, type = 'bar') {
        await this.ensureInitialized();
        return this.chartRenderer.render(data, type);
    }

    /**
     * 导出数据
     */
    async exportData(data, format = 'json') {
        await this.ensureInitialized();
        return this.exportManager.export(data, format);
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
const analysisManager = new AnalysisManager();

// 导出模块接口
export {
    AnalysisManager,
    analysisManager,
    ChartRenderer,
    Statistics,
    ExportManager
};
