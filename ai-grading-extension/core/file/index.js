/**
 * 文件管理模块入口文件
 * @description 提供文件导入、导出和管理功能
 */

import { FileImporter } from './file-importer.js';
import { FileExporter } from './file-exporter.js';

/**
 * 文件管理器
 */
class FileManager {
    constructor() {
        this.importer = new FileImporter();
        this.exporter = new FileExporter();
        this.isInitialized = false;
    }

    /**
     * 初始化文件管理模块
     */
    async initialize() {
        if (this.isInitialized) {
            
            return;
        }

        try {
            await Promise.all([
                this.importer.initialize(),
                this.exporter.initialize()
            ]);

            this.isInitialized = true;
            
        } catch (error) {
            // console.error('文件管理模块初始化失败:', error);
            throw error;
        }
    }

    /**
     * 导入文件
     */
    async importFile(file, options = {}) {
        await this.ensureInitialized();
        return this.importer.import(file, options);
    }

    /**
     * 导出文件
     */
    async exportFile(data, format = 'json', filename = 'export') {
        await this.ensureInitialized();
        return this.exporter.export(data, format, filename);
    }

    /**
     * 获取支持的文件格式
     */
    getSupportedFormats() {
        return {
            import: this.importer.getSupportedFormats(),
            export: this.exporter.getSupportedFormats()
        };
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
const fileManager = new FileManager();

// 导出模块接口
export {
    FileManager,
    fileManager,
    FileImporter,
    FileExporter
};
