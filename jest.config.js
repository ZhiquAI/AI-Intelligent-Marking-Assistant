/**
 * Jest配置 - 测试框架
 * @description AI智能阅卷助手测试配置
 */

module.exports = {
    // 测试环境
    testEnvironment: 'jsdom',

    // 测试文件匹配模式
    testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],

    // 模块路径映射
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/ai-grading-extension/$1',
        '^@core/(.*)$': '<rootDir>/ai-grading-extension/core/$1',
        '^@ui/(.*)$': '<rootDir>/ai-grading-extension/ui/$1',
        '^@utils/(.*)$': '<rootDir>/ai-grading-extension/utils/$1',
        '^@popup/(.*)$': '<rootDir>/ai-grading-extension/popup/$1',
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg|ico)$': '<rootDir>/tests/__mocks__/fileMock.js'
    },

    // 测试覆盖率配置
    collectCoverageFrom: [
        'ai-grading-extension/**/*.js',
        '!ai-grading-extension/**/*.min.js',
        '!ai-grading-extension/assets/**',
        '!**/node_modules/**',
        '!**/vendor/**'
    ],

    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // 测试超时时间
    testTimeout: 10000,

    // 设置文件
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // 全局变量
    globals: {
        chrome: {},
        browser: {}
    },

    // 转换器配置
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // 忽略的文件
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

    // 模块文件扩展名
    moduleFileExtensions: ['js', 'json'],

    // 测试环境选项
    testEnvironmentOptions: {
        url: 'http://localhost',
        resources: 'usable'
    },

    // 详细输出
    verbose: true,

    // 清除模拟
    clearMocks: true,

    // 重置模块
    resetModules: true
};
