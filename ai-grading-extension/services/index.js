/**
 * 服务模块入口
 * Services Module Entry Point - 导出所有服务组件
 */

// AI服务相关
export { AIService } from './ai-service.js';
export { AIScoringEngine } from './ai-scoring-engine.js';
export { WorkflowManager } from './workflow-manager.js';

// 智学网集成
export { ZhiXueAdapter } from './zhixue-adapter.js';

// OCR服务（保留接口,但当前不使用传统OCR）
// export { OCRService } from './ocr-service.js';

// 工具类
export { Logger } from '../utils/logger.js';

// 创建服务实例的工厂函数
export function createServices() {
    const aiService = AIService();
    const aiScoringEngine = AIScoringEngine();
    const zhixueAdapter = ZhiXueAdapter();
    const workflowManager = WorkflowManager();

    return {
        aiService,
        aiScoringEngine,
        zhixueAdapter,
        workflowManager
    };
}

// 创建并初始化所有服务的便捷函数
export async function initializeServices() {
    const services = createServices();

    try {
        // 初始化AI服务
        await services.aiService.init();

        // 初始化AI评分引擎
        await services.aiScoringEngine.init();

        // 初始化智学网适配器
        await services.zhixueAdapter.init();

        // 初始化工作流管理器
        await services.workflowManager.init();

        return services;
    } catch (error) {
        // console.error('❌ 服务初始化失败:', error);

        // 清理已初始化的服务
        for (const [name, service] of Object.entries(services)) {
            if (service.destroy) {
                try {
                    await service.destroy();
                } catch (e) {
                    // console.error(`清理${name}失败:`, e);
                }
            }
        }

        throw error;
    }
}

// 创建服务管理器类
export class ServiceManager {
    constructor() {
        this.services = {};
        this.isInitialized = false;
    }

    /**
     * 初始化所有服务
     */
    async init() {
        if (this.isInitialized) {
            // console.warn('服务管理器已经初始化');
            return;
        }

        this.services = await initializeServices();
        this.isInitialized = true;

        // 绑定服务间的事件协调
        this.bindServiceEvents();
    }

    /**
     * 绑定服务间事件协调
     */
    bindServiceEvents() {
        const { aiService, aiScoringEngine, zhixueAdapter, workflowManager } = this.services;

        // AI服务状态变化时,通知评分引擎
        aiService.on('model-changed', (data) => {
            aiScoringEngine.emit('ai-model-changed', data);
        });

        // 智学网适配器检测到页面变化时,通知工作流管理器
        zhixueAdapter.on('page-changed', (data) => {
            workflowManager.emit('zhixue-page-changed', data);
        });

        // 工作流管理器的全局事件协调
        workflowManager.on('workflow-error', (data) => {
            // console.error('工作流错误:', data.error);
            // 可以在这里添加全局错误处理逻辑
        });

        workflowManager.on('manual-review-required', (data) => {

            // 可以在这里触发UI层面的复核流程
        });
    }

    /**
     * 获取服务实例
     */
    getService(name) {
        return this.services[name];
    }

    /**
     * 获取所有服务
     */
    getAllServices() {
        return { ...this.services };
    }

    /**
     * 获取服务状态
     */
    getServiceStatus() {
        if (!this.isInitialized) {
            return { status: 'not-initialized' };
        }

        const status = {};

        for (const [name, service] of Object.entries(this.services)) {
            if (service.getStatus) {
                status[name] = service.getStatus();
            } else if (service.isInitialized !== undefined) {
                status[name] = { isInitialized: service.isInitialized };
            } else {
                status[name] = { status: 'unknown' };
            }
        }

        return {
            status: 'initialized',
            services: status
        };
    }

    /**
     * 销毁所有服务
     */
    async destroy() {
        if (!this.isInitialized) {
            return;
        }

        // 按依赖顺序销毁服务
        const destroyOrder = ['workflowManager', 'aiScoringEngine', 'zhixueAdapter', 'aiService'];

        for (const serviceName of destroyOrder) {
            const service = this.services[serviceName];
            if (service && service.destroy) {
                try {
                    await service.destroy();
                } catch (error) {
                    // console.error(`❌ 销毁${serviceName}失败:`, error);
                }
            }
        }

        this.services = {};
        this.isInitialized = false;
    }
}

// 创建全局服务管理器实例
export const serviceManager = ServiceManager();

// 自动初始化（如果在浏览器环境中）
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async() => {
        try {
            await serviceManager.init();
        } catch (error) {
            // console.error('❌ 服务层启动失败:', error);
        }
    });

    // 提供全局访问点
    window.AIGradingServices = {
        serviceManager,
        createServices,
        initializeServices,
        ServiceManager
    };
}
