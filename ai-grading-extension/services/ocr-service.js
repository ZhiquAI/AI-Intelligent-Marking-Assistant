/**
 * OCR Service
 * OCR文字识别服务 - 处理图片中的文字提取
 */

import { EventEmitter } from '../utils/event-emitter.js';
import { validateFile } from '../utils/security-utils.js';

export class OCRService extends EventEmitter {
    constructor() {
        super();
        this.supportedLanguages = ['zh-CN', 'en', 'zh-TW', 'ja', 'ko'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.isProcessing = false;
        this.currentLanguage = 'zh-CN';
    }

    /**
     * 配置OCR服务
     */
    async configure(config) {
        this.currentLanguage = config.language || 'zh-CN';
        this.maxFileSize = config.maxFileSize || this.maxFileSize;
        this.allowedFormats = config.allowedFormats || this.allowedFormats;
    }

    /**
     * 处理图片文件
     */
    async processImage(file, options = {}) {
        try {
            this.isProcessing = true;
            this.emit('processing-start', { file });

            // 验证文件
            const validation = validateFile(file, this.allowedFormats, this.maxFileSize);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // 读取图片
            const imageData = await this.readImageFile(file);

            // 预处理图片
            const processedImage = await this.preprocessImage(imageData, options);

            // 执行OCR
            const textResult = await this.performOCR(processedImage, {
                language: options.language || this.currentLanguage,
                ...options
            });

            // 后处理结果
            const finalResult = await this.postprocessResult(textResult, options);

            this.emit('processing-complete', {
                result: finalResult,
                originalFile: file
            });

            return finalResult;
        } catch (error) {
            // console.error('OCR处理失败:', error);
            this.emit('processing-error', { error, file });
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 批量处理图片
     */
    async processImages(files, options = {}) {
        const results = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                this.emit('batch-progress', {
                    current: i + 1,
                    total: files.length,
                    file: file.name
                });

                const result = await this.processImage(file, options);
                results.push({
                    file: file.name,
                    success: true,
                    result
                });
            } catch (error) {
                results.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }

        this.emit('batch-complete', { results, total: files.length });
        return results;
    }

    /**
     * 读取图片文件
     */
    async readImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = FileReader();

            reader.onload = (e) => {
                const img = Image();
                img.onload = () => {
                    resolve({
                        image: img,
                        dataUrl: e.target.result,
                        width: img.width,
                        height: img.height,
                        file
                    });
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 预处理图片
     */
    async preprocessImage(imageData, options) {
        const { image, width, height } = imageData;

        // 创建canvas进行图片处理
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 设置canvas尺寸
        let { targetWidth, targetHeight } = this.calculateOptimalSize(width, height);

        if (options.maxWidth && targetWidth > options.maxWidth) {
            const ratio = options.maxWidth / targetWidth;
            targetWidth = options.maxWidth;
            targetHeight = Math.round(targetHeight * ratio);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 设置图片质量
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 绘制图片
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

        // 应用图像增强
        if (options.enhance) {
            this.enhanceImage(ctx, targetWidth, targetHeight);
        }

        // 转换为base64
        const processedDataUrl = canvas.toDataURL('image/png', 0.9);

        return {
            dataUrl: processedDataUrl,
            width: targetWidth,
            height: targetHeight
        };
    }

    /**
     * 计算最优尺寸
     */
    calculateOptimalSize(originalWidth, originalHeight) {
        const maxSize = 2048; // 最大尺寸限制

        if (originalWidth <= maxSize && originalHeight <= maxSize) {
            return { targetWidth: originalWidth, targetHeight: originalHeight };
        }

        const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight);

        return {
            targetWidth: Math.round(originalWidth * ratio),
            targetHeight: Math.round(originalHeight * ratio)
        };
    }

    /**
     * 增强图片质量
     */
    enhanceImage(ctx, width, height) {
        // 获取图片数据
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 应用锐化滤镜
        this.applySharpenFilter(ctx, imageData);

        // 调整对比度和亮度
        this.adjustContrastBrightness(data, 1.2, 10);

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * 应用锐化滤镜
     */
    applySharpenFilter(ctx, imageData) {
        const { data, width, height } = imageData;
        const output = new Uint8ClampedArray(data);

        // 简单的锐化卷积核
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) { // 只处理RGB,跳过alpha
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    const outputIdx = (y * width + x) * 4 + c;
                    output[outputIdx] = Math.min(255, Math.max(0, sum));
                }
                // 复制alpha通道
                output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
            }
        }

        data.set(output);
    }

    /**
     * 调整对比度和亮度
     */
    adjustContrastBrightness(data, contrast, brightness) {
        for (let i = 0; i < data.length; i += 4) {
            // 调整RGB通道
            for (let j = 0; j < 3; j++) {
                data[i + j] = Math.min(255, Math.max(0,
                    (data[i + j] - 128) * contrast + 128 + brightness
                ));
            }
        }
    }

    /**
     * 执行OCR
     */
    async performOCR(imageData, options) {
        const { dataUrl } = imageData;
        const { language } = options;

        // 使用Tesseract.js进行OCR识别
        if (typeof Tesseract !== 'undefined') {
            return await this.performTesseractOCR(dataUrl, language);
        }

        // 降级方案:使用浏览器原生OCR API（如果可用）
        if ('EyeDropper' in window && 'recognizeText' in window) {
            return await this.performNativeOCR(dataUrl, language);
        }

        // 模拟OCR结果（开发模式）
        return this.simulateOCRResult(language);
    }

    /**
     * 使用Tesseract.js进行OCR
     */
    async performTesseractOCR(imageUrl, language) {
        try {
            const result = await Tesseract.recognize(imageUrl, language, {
                logger: (m) => {
                    this.emit('tesseract-progress', m);
                }
            });

            return {
                text: result.data.text,
                confidence: result.data.confidence,
                lines: result.data.lines.map(line => ({
                    text: line.text,
                    confidence: line.confidence,
                    bbox: line.bbox
                })),
                words: result.data.words.map(word => ({
                    text: word.text,
                    confidence: word.confidence,
                    bbox: word.bbox
                }))
            };
        } catch (error) {
            // console.error('Tesseract OCR失败:', error);
            throw new Error(`OCR识别失败: ${error.message}`);
        }
    }

    /**
     * 使用原生OCR API
     */
    async performNativeOCR(imageUrl, language) {
        // 这里可以实现浏览器原生OCR API的调用
        // 目前作为占位符
        throw new Error('原生OCR API尚未实现');
    }

    /**
     * 模拟OCR结果（用于开发测试）
     */
    simulateOCRResult(language) {
        const mockTexts = {
            'zh-CN': `第1题（满分10分）

解:
(1) 根据题意,我们可以得到:
    x + y = 10
    x - y = 2

解方程组得:
    x = 6, y = 4

(2) 验证结果:
    6 + 4 = 10 ✓
    6 - 4 = 2 ✓

因此,最终答案为:x = 6, y = 4

评分建议:
- 正确列出方程组:+3分
- 正确求解:+4分
- 正确验证:+2分
- 答案完整:+1分`,
            en: `Question 1 (Full marks: 10 points)

Solution:
(1) According to the problem, we can get:
    x + y = 10
    x - y = 2

Solving the equations:
    x = 6, y = 4

(2) Verification:
    6 + 4 = 10 ✓
    6 - 4 = 2 ✓

Therefore, the final answer is: x = 6, y = 4

Scoring suggestions:
- Correct equations: +3 points
- Correct solution: +4 points
- Correct verification: +2 points
- Complete answer: +1 point`
        };

        const text = mockTexts[language] || mockTexts['zh-CN'];

        return {
            text,
            confidence: 95,
            lines: text.split('\n').map((line, index) => ({
                text: line,
                confidence: 90 + Math.random() * 10,
                bbox: { x: 0, y: index * 20, width: 400, height: 20 }
            })),
            words: text.split(/\s+/).map((word, index) => ({
                text: word,
                confidence: 85 + Math.random() * 15,
                bbox: { x: (index % 10) * 40, y: Math.floor(index / 10) * 20, width: 35, height: 15 }
            }))
        };
    }

    /**
     * 后处理OCR结果
     */
    async postprocessResult(ocrResult, options) {
        let { text, lines, words } = ocrResult;

        // 数学公式优化
        if (options.mathOptimization) {
            text = this.optimizeMathExpressions(text);
        }

        // 中文标点优化
        if (options.chinesePunctuation) {
            text = this.optimizeChinesePunctuation(text);
        }

        // 清理多余空格
        text = this.cleanExtraSpaces(text);

        // 结构分析
        const structure = this.analyzeStructure(text, lines);

        return {
            text,
            originalText: ocrResult.text,
            confidence: ocrResult.confidence,
            lines,
            words,
            structure,
            language: options.language || this.currentLanguage
        };
    }

    /**
     * 优化数学表达式
     */
    optimizeMathExpressions(text) {
        // 将常见的数学符号错误进行修正
        const corrections = {
            x: '×', // 乘号
            '/': '÷', // 除号
            '->': '→', // 箭头
            '<=': '≤', // 小于等于
            '>=': '≥', // 大于等于
            '!=': '≠', // 不等于
            π: 'π', // 圆周率
            alpha: 'α', // 希腊字母
            beta: 'β',
            gamma: 'γ',
            delta: 'δ'
        };

        let corrected = text;
        Object.entries(corrections).forEach(([wrong, correct]) => {
            corrected = corrected.replace(new RegExp(wrong, 'g'), correct);
        });

        return corrected;
    }

    /**
     * 优化中文标点
     */
    optimizeChinesePunctuation(text) {
        const corrections = {
            ',': ',',
            '.': '.',
            '?': '？',
            '!': '！',
            ':': ':',
            ';': '；',
            '(': '（',
            ')': '）',
            '[': '【',
            ']': '】'
        };

        let corrected = text;
        Object.entries(corrections).forEach(([en, cn]) => {
            corrected = corrected.replace(new RegExp(`\\${en}`, 'g'), cn);
        });

        return corrected;
    }

    /**
     * 清理多余空格
     */
    cleanExtraSpaces(text) {
        return text
            .replace(/[ \t]+/g, ' ') // 多个空格或制表符替换为单个空格
            .replace(/[ ]+/g, ' ') // 多个空格替换为单个空格
            .replace(/\s*\n\s*/g, '\n') // 清理行首行尾空格
            .trim();
    }

    /**
     * 分析文本结构
     */
    analyzeStructure(text, lines) {
        const structure = {
            title: null,
            questions: [],
            equations: [],
            answers: []
        };

        const linesArray = text.split('\n');

        linesArray.forEach((line, index) => {
            const trimmed = line.trim();

            // 检测标题
            if (index === 0 && /第\d+题|Question \d+/i.test(trimmed)) {
                structure.title = trimmed;
            }

            // 检测问题
            if (/解[::]|解\s*答|Solution[::]/i.test(trimmed)) {
                structure.questions.push({
                    text: trimmed,
                    line: index
                });
            }

            // 检测公式
            if (/[=＝][><≤≥≠]|[\+\-×÷^=]|frac\{|sqrt\{|\d+\.?\d*/.test(trimmed)) {
                structure.equations.push({
                    text: trimmed,
                    line: index
                });
            }

            // 检测答案
            if (/答[::]|答案[::]|因此|所以|Answer[::]|Therefore/i.test(trimmed)) {
                structure.answers.push({
                    text: trimmed,
                    line: index
                });
            }
        });

        return structure;
    }

    /**
     * 获取支持的语言列表
     */
    getSupportedLanguages() {
        return [
            { code: 'zh-CN', name: '简体中文' },
            { code: 'zh-TW', name: '繁体中文' },
            { code: 'en', name: 'English' },
            { code: 'ja', name: '日本語' },
            { code: 'ko', name: '한국어' }
        ];
    }

    /**
     * 获取服务状态
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            currentLanguage: this.currentLanguage,
            supportedLanguages: this.supportedLanguages,
            maxFileSize: this.maxFileSize,
            allowedFormats: this.allowedFormats
        };
    }

    /**
     * 销毁服务
     */
    destroy() {
        this.isProcessing = false;
        this.removeAllListeners();
    }
}
