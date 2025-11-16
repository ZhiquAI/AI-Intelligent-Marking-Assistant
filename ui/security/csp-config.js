/**
 * CSP Configuration - 内容安全策略配置
 * 提供CSP规则验证和动态策略生成
 */

/**
 * CSP 策略配置
 */
export const CSP_CONFIG = {
    // 脚本策略
    scriptSrc: [
        "'self'", // 允许加载同源脚本
        // "'unsafe-inline'", // 仅在必要时使用内联脚本
        // "'unsafe-eval'", // 仅在必要时使用eval()
        // "'strict-dynamic'" // 严格动态模式
    ],

    // 对象策略
    objectSrc: [
        "'none'" // 禁止加载所有对象
    ],

    // 基础URI策略
    baseUri: [
        "'self'" // 仅允许同源基础URI
    ],

    // 表单提交策略
    formAction: [
        "'self'" // 仅允许提交到同源
    ],

    // 嵌入策略
    frameAncestors: [
        "'none'" // 禁止被任何页面嵌入
    ],

    // 升级不安全请求
    upgradeInsecureRequests: [],

    // 连接策略
    connectSrc: [
        "'self'",
        'https://api.openai.com',
        'https://generativelanguage.googleapis.com',
        'https://dashscope.aliyuncs.com',
        'https://open.bigmodel.cn',
        'wss://api.openai.com', // WebSocket连接
        'wss://generativelanguage.googleapis.com',
        'wss://dashscope.aliyuncs.com',
        'wss://open.bigmodel.cn'
    ],

    // 样式策略
    styleSrc: [
        "'self'",
        "'unsafe-inline'" // 允许内联样式（需要逐步移除）
    ],

    // 图片策略
    imgSrc: [
        "'self'",
        'data:', // 允许data URL图片
        'https:' // 允许所有HTTPS图片
    ],

    // 字体策略
    fontSrc: [
        "'self'",
        'data:' // 允许data URL字体
    ],

    // 媒体策略
    mediaSrc: [
        "'self'"
    ],

    // Worker策略
    workerSrc: [
        "'self'"
    ],

    // 默认策略
    defaultSrc: [
        "'self'"
    ]
};

/**
 * CSP 违规报告处理
 */
export class CSPViolationReporter {
    constructor() {
        this.violations = [];
        this.maxViolations = 100; // 最大记录违规数量
        this.reportingEndpoint = null;

        // 绑定安全策略违规事件
        this.bindViolationReporter();
    }

    /**
     * 绑定违规报告器
     */
    bindViolationReporter() {
        // 监听安全策略违规
        document.addEventListener('securitypolicyviolation', (event) => {
            this.handleViolation(event);
        });

        // 如果支持报告API，设置报告观察者
        if ('ReportingObserver' in window) {
            const observer = new ReportingObserver((reports) => {
                reports.forEach((report) => {
                    if (report.type === 'csp-violation') {
                        this.handleViolation(report.body);
                    }
                });
            }, {
                buffered: true
            });

            observer.observe();
        }
    }

    /**
     * 处理CSP违规
     */
    handleViolation(violation) {
        const violationData = {
            timestamp: Date.now(),
            violatedDirective: violation.violatedDirective,
            blockedURI: violation.blockedURI,
            sourceFile: violation.sourceFile,
            lineNumber: violation.lineNumber,
            columnNumber: violation.columnNumber,
            originalPolicy: violation.originalPolicy,
            referrer: violation.referrer,
            statusCode: violation.statusCode,
            sample: violation.sample
        };

        // 记录违规
        this.violations.push(violationData);

        // 限制记录数量
        if (this.violations.length > this.maxViolations) {
            this.violations.shift();
        }

        // 记录到控制台
        console.warn('CSP Violation:', violationData);

        // 发送报告到指定端点
        if (this.reportingEndpoint) {
            this.sendReport(violationData);
        }

        // 触发自定义事件
        this.dispatchEvent('csp-violation', violationData);
    }

    /**
     * 设置报告端点
     */
    setReportingEndpoint(endpoint) {
        this.reportingEndpoint = endpoint;
    }

    /**
     * 发送违规报告
     */
    async sendReport(violationData) {
        try {
            await fetch(this.reportingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(violationData)
            });
        } catch (error) {
            console.error('Failed to send CSP violation report:', error);
        }
    }

    /**
     * 分发自定义事件
     */
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * 获取违规记录
     */
    getViolations() {
        return [...this.violations];
    }

    /**
     * 清除违规记录
     */
    clearViolations() {
        this.violations = [];
    }

    /**
     * 获取违规统计
     */
    getViolationStats() {
        const stats = {
            total: this.violations.length,
            byDirective: {},
            bySource: {},
            recent: this.violations.slice(-10)
        };

        this.violations.forEach(violation => {
            // 按指令统计
            const directive = violation.violatedDirective;
            stats.byDirective[directive] = (stats.byDirective[directive] || 0) + 1;

            // 按源文件统计
            const source = violation.sourceFile || 'unknown';
            stats.bySource[source] = (stats.bySource[source] || 0) + 1;
        });

        return stats;
    }
}

/**
 * 动态CSP策略生成器
 */
export class DynamicCSPGenerator {
    constructor() {
        this.baseConfig = { ...CSP_CONFIG };
        this.runtimeConfig = {};
        this.customDirectives = {};
    }

    /**
     * 添加允许的域名
     */
    addAllowedDomain(directive, domain) {
        if (!this.runtimeConfig[directive]) {
            this.runtimeConfig[directive] = [...(this.baseConfig[directive] || [])];
        }

        if (!this.runtimeConfig[directive].includes(domain)) {
            this.runtimeConfig[directive].push(domain);
        }
    }

    /**
     * 移除允许的域名
     */
    removeAllowedDomain(directive, domain) {
        if (this.runtimeConfig[directive]) {
            const index = this.runtimeConfig[directive].indexOf(domain);
            if (index > -1) {
                this.runtimeConfig[directive].splice(index, 1);
            }
        }
    }

    /**
     * 添加自定义指令
     */
    addCustomDirective(name, values) {
        this.customDirectives[name] = Array.isArray(values) ? values : [values];
    }

    /**
     * 生成CSP策略字符串
     */
    generateCSPString() {
        const directives = { ...this.baseConfig, ...this.runtimeConfig, ...this.customDirectives };
        const cspParts = [];

        Object.keys(directives).forEach(directive => {
            const values = directives[directive];
            if (values && values.length > 0) {
                cspParts.push(`${directive.replace(/([A-Z])/g, '-$1').toLowerCase()} ${values.join(' ')}`);
            }
        });

        return cspParts.join('; ');
    }

    /**
     * 验证CSP策略
     */
    validateCSP() {
        const cspString = this.generateCSPString();

        // 基本验证规则
        const requiredDirectives = ['script-src', 'object-src', 'default-src'];
        const warnings = [];

        requiredDirectives.forEach(directive => {
            if (!this.runtimeConfig[directive] && !this.baseConfig[directive]) {
                warnings.push(`Missing required directive: ${directive}`);
            }
        });

        // 检查不安全的配置
        const unsafePatterns = [
            { pattern: /'unsafe-inline'/g, message: 'Contains unsafe-inline directives' },
            { pattern: /'unsafe-eval'/g, message: 'Contains unsafe-eval directives' },
            { pattern: /\*/g, message: 'Contains wildcard domains' }
        ];

        unsafePatterns.forEach(({ pattern, message }) => {
            if (pattern.test(cspString)) {
                warnings.push(message);
            }
        });

        return {
            isValid: warnings.length === 0,
            warnings,
            cspString
        };
    }

    /**
     * 应用CSP到meta标签
     */
    applyToMeta() {
        const cspString = this.generateCSPString();
        let metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('http-equiv', 'Content-Security-Policy');
            document.head.appendChild(metaTag);
        }

        metaTag.setAttribute('content', cspString);
        return cspString;
    }
}

/**
 * CSP 安全检查工具
 */
export class CSPSecurityChecker {
    constructor() {
        this.securityChecks = [];
    }

    /**
     * 添加安全检查
     */
    addSecurityCheck(name, checkFunction) {
        this.securityChecks.push({ name, check: checkFunction });
    }

    /**
     * 执行所有安全检查
     */
    async runSecurityChecks() {
        const results = [];

        for (const { name, check } of this.securityChecks) {
            try {
                const result = await check();
                results.push({ name, passed: result.passed, message: result.message });
            } catch (error) {
                results.push({ name, passed: false, message: `Check failed: ${error.message}` });
            }
        }

        return results;
    }

    /**
     * 添加默认安全检查
     */
    addDefaultChecks() {
        // 检查全局变量泄漏
        this.addSecurityCheck('Global Variable Leakage', () => {
            const unsafeGlobals = ['$', 'jQuery', '_'];
            const leakedGlobals = unsafeGlobals.filter(global => window[global] !== undefined);

            return {
                passed: leakedGlobals.length === 0,
                message: leakedGlobals.length > 0 ? `Leaked globals: ${leakedGlobals.join(', ')}` : 'No global variable leakage detected'
            };
        });

        // 检查内联脚本
        this.addSecurityCheck('Inline Scripts', () => {
            const inlineScripts = document.querySelectorAll('script:not([src])');

            return {
                passed: inlineScripts.length === 0,
                message: inlineScripts.length > 0 ? `Found ${inlineScripts.length} inline scripts` : 'No inline scripts detected'
            };
        });

        // 检查内联样式
        this.addSecurityCheck('Inline Styles', () => {
            const inlineStyles = document.querySelectorAll('style, [style]');

            return {
                passed: inlineStyles.length === 0,
                message: inlineStyles.length > 0 ? `Found ${inlineStyles.length} inline styles` : 'No inline styles detected'
            };
        });

        // 检查eval使用
        this.addSecurityCheck('Eval Usage', () => {
            const scripts = Array.from(document.scripts);
            const evalScripts = scripts.filter(script => {
                const content = script.textContent || script.innerHTML;
                return content && (content.includes('eval(') || content.includes('Function('));
            });

            return {
                passed: evalScripts.length === 0,
                message: evalScripts.length > 0 ? `Found eval usage in ${evalScripts.length} scripts` : 'No eval usage detected'
            };
        });
    }
}

// 创建全局实例
export const cspViolationReporter = new CSPViolationReporter();
export const dynamicCSPGenerator = new DynamicCSPGenerator();
export const cspSecurityChecker = new CSPSecurityChecker();

// 添加默认安全检查
cspSecurityChecker.addDefaultChecks();

// 导出便捷函数
export function addAllowedDomain(directive, domain) {
    return dynamicCSPGenerator.addAllowedDomain(directive, domain);
}

export function removeAllowedDomain(directive, domain) {
    return dynamicCSPGenerator.removeAllowedDomain(directive, domain);
}

export function generateCSPString() {
    return dynamicCSPGenerator.generateCSPString();
}

export function validateCSP() {
    return dynamicCSPGenerator.validateCSP();
}

export function getViolationStats() {
    return cspViolationReporter.getViolationStats();
}

export async function runSecurityChecks() {
    return cspSecurityChecker.runSecurityChecks();
}

// 默认导出
export default {
    CSP_CONFIG,
    CSPViolationReporter,
    DynamicCSPGenerator,
    CSPSecurityChecker,
    cspViolationReporter,
    dynamicCSPGenerator,
    cspSecurityChecker,
    addAllowedDomain,
    removeAllowedDomain,
    generateCSPString,
    validateCSP,
    getViolationStats,
    runSecurityChecks
};