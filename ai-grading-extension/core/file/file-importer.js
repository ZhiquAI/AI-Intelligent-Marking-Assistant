// ============================================================================
// 智学网AI阅卷助手 - 文件导入模块
// 100%还原原HTML中的文件导入逻辑
// ============================================================================

export class FileImporter {
    constructor() {
        this.supportedFormats = ['.json', '.csv', '.xlsx', '.xls'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.importHistory = [];
        this.currentImportData = null;
        
    }

    /**
     * 初始化文件导入
     */
    initialize() {
        

        // 创建隐藏的文件输入框
        this.createFileInput();

        // 绑定拖拽事件
        this.bindDragAndDropEvents();

        
    }

    /**
     * 创建文件输入框
     */
    createFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.id = 'fileImporterInput';
        input.style.display = 'none';
        input.accept = this.supportedFormats.join(',');
        input.multiple = true;

        input.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        document.body.appendChild(input);
    }

    /**
     * 绑定拖拽事件
     */
    bindDragAndDropEvents() {
        const dropZone = document.getElementById('fileDropZone');
        if (!dropZone) return;

        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // 高亮拖拽区域
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('border-blue-500', 'bg-blue-50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            }, false);
        });

        // 处理文件拖放
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelect(files);
        }, false);
    }

    /**
     * 防止默认事件
     * @param {Event} e - 事件对象
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * 打开文件选择对话框
     */
    openFileDialog() {
        const input = document.getElementById('fileImporterInput');
        if (input) {
            input.click();
        }
    }

    /**
     * 处理文件选择
     * @param {FileList} files - 文件列表
     */
    async handleFileSelect(files) {
        

        if (!files || files.length === 0) {
            this.showToast('warning', '未选择文件', '请选择要导入的文件');
            return;
        }

        // 验证文件
        const validFiles = this.validateFiles(files);
        if (validFiles.length === 0) {
            this.showToast('error', '文件无效', '没有找到有效的文件');
            return;
        }

        // 导入文件
        for (const file of validFiles) {
            try {
                await this.importFile(file);
            } catch (error) {
                // console.error('❌ 导入文件失败:', error);
                this.showToast('error', '导入失败', `文件 ${file.name} 导入失败: ${error.message}`);
            }
        }
    }

    /**
     * 验证文件
     * @param {FileList} files - 文件列表
     * @returns {Array} 有效文件数组
     */
    validateFiles(files) {
        const validFiles = [];

        for (const file of files) {
            // 检查文件大小
            if (file.size > this.maxFileSize) {
                // console.warn(`⚠️ 文件过大: ${file.name}`);
                this.showToast('warning', '文件过大', `${file.name} 超过大小限制 (${this.maxFileSize / 1024 / 1024}MB)`);
                continue;
            }

            // 检查文件类型
            const ext = this.getFileExtension(file.name);
            if (!this.supportedFormats.includes(ext)) {
                // console.warn(`⚠️ 不支持的文件格式: ${file.name}`);
                this.showToast('warning', '格式不支持', `${file.name} 不是支持的格式`);
                continue;
            }

            validFiles.push(file);
        }

        return validFiles;
    }

    /**
     * 导入单个文件
     * @param {File} file - 文件对象
     * @returns {Object} 导入结果
     */
    async importFile(file) {
        

        const ext = this.getFileExtension(file.name);
        let data = null;

        switch (ext) {
            case '.json':
                data = await this.importJSON(file);
                break;
            case '.csv':
                data = await this.importCSV(file);
                break;
            case '.xlsx':
            case '.xls':
                data = await this.importExcel(file);
                break;
            default:
                throw new Error(`不支持的文件格式: ${ext}`);
        }

        if (data) {
            // 添加到历史记录
            this.addToHistory({
                filename: file.name,
                format: ext,
                size: file.size,
                timestamp: Date.now(),
                recordCount: Array.isArray(data) ? data.length : 1
            });

            this.showToast('success', '导入成功', `文件 ${file.name} 已导入`);
            this.onImportSuccess(data, file);
        }

        return data;
    }

    /**
     * 导入JSON文件
     * @param {File} file - 文件对象
     * @returns {Object} 解析后的数据
     */
    async importJSON(file) {
        const text = await this.readFileAsText(file);
        try {
            const data = JSON.parse(text);
            
            return data;
        } catch (error) {
            throw new Error('JSON格式错误');
        }
    }

    /**
     * 导入CSV文件
     * @param {File} file - 文件对象
     * @returns {Array} 解析后的数据
     */
    async importCSV(file) {
        const text = await this.readFileAsText(file);
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            throw new Error('CSV文件为空');
        }

        // 解析CSV
        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            data.push(row);
        }

        
        return data;
    }

    /**
     * 导入Excel文件
     * @param {File} file - 文件对象
     * @returns {Array} 解析后的数据
     */
    async importExcel(file) {
        

        try {
            // 使用SheetJS库解析Excel文件
            const data = await this.readExcelFile(file);
            
            return data;
        } catch (error) {
            // console.error('❌ Excel文件解析失败:', error);
            throw new Error(`Excel文件解析失败: ${error.message}`);
        }
    }

    /**
     * 读取Excel文件内容
     * @param {File} file - Excel文件
     * @returns {Array} 解析后的数据数组
     */
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    // 检查是否加载了xlsx库
                    if (typeof XLSX === 'undefined') {
                        throw new Error('需要加载SheetJS (xlsx) 库来解析Excel文件');
                    }

                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // 获取第一个工作表
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // 转换为JSON格式
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        defval: '', // 空单元格默认为空字符串
                        raw: false // 格式化数值和日期
                    });

                    

                    // 标准化数据格式
                    const normalizedData = this.normalizeExcelData(jsonData);
                    resolve(normalizedData);

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 标准化Excel数据格式
     * @param {Array} rawData - 原始Excel数据
     * @returns {Array} 标准化后的数据
     */
    normalizeExcelData(rawData) {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [];
        }

        return rawData.map((row, index) => {
            // 尝试自动检测列映射
            const normalizedRow = {
                id: this.getValueFromRow(row, ['id', 'ID', '编号', '序号', '学号']),
                studentName: this.getValueFromRow(row, ['name', '姓名', '学生姓名', 'studentName', 'student']),
                totalScore: this.parseScore(this.getValueFromRow(row, ['score', '总分', '成绩', '分数', 'totalScore'])),
                gradingTime: this.parseDate(this.getValueFromRow(row, ['time', '时间', '日期', 'gradingTime', '评分时间'])),
                status: this.getValueFromRow(row, ['status', '状态', '评分状态']) || '已评分',
                dimensions: this.parseDimensions(row),
                comments: this.getValueFromRow(row, ['comments', '评语', '备注', 'comment']),
                raw: row // 保留原始数据用于调试
            };

            // 生成ID（如果没有）
            if (!normalizedRow.id) {
                normalizedRow.id = `record_${Date.now()}_${index}`;
            }

            // 生成学生姓名（如果没有）
            if (!normalizedRow.studentName) {
                normalizedRow.studentName = `学生${index + 1}`;
            }

            return normalizedRow;
        });
    }

    /**
     * 从行数据中获取指定列的值
     * @param {Object} row - 行数据
     * @param {Array} possibleKeys - 可能的列名
     * @returns {any} 找到的值或空字符串
     */
    getValueFromRow(row, possibleKeys) {
        for (const key of possibleKeys) {
            // 精确匹配
            if (row.hasOwnProperty(key)) {
                return row[key];
            }

            // 不区分大小写匹配
            const lowerKey = key.toLowerCase();
            for (const rowKey of Object.keys(row)) {
                if (rowKey.toLowerCase() === lowerKey) {
                    return row[rowKey];
                }
            }
        }
        return '';
    }

    /**
     * 解析分数值
     * @param {any} value - 原始值
     * @returns {number} 解析后的分数
     */
    parseScore(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const num = parseFloat(value.replace(/[^\d.]/g, ''));
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }

    /**
     * 解析日期值
     * @param {any} value - 原始值
     * @returns {string} ISO格式的日期字符串
     */
    parseDate(value) {
        if (!value) return new Date().toISOString();

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (typeof value === 'number') {
            // Excel日期序列号
            const excelEpoch = new Date(1900, 0, 1);
            const days = value - 2; // Excel的日期从1900-01-01开始，但是把1900年当作闰年
            const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
            return date.toISOString();
        }

        if (typeof value === 'string') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
        }

        return new Date().toISOString();
    }

    /**
     * 解析评分维度
     * @param {Object} row - 行数据
     * @returns {Array} 维度数组
     */
    parseDimensions(row) {
        const dimensions = [];

        // 查找可能的维度列
        const dimensionPatterns = ['dim', 'dimension', '维度', '分项', 'score_'];

        Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase();

            // 检查是否是维度相关的列
            if (dimensionPatterns.some(pattern => lowerKey.includes(pattern.toLowerCase()))) {
                const value = row[key];
                const score = this.parseScore(value);

                if (score > 0) { // 只添加有分数的维度
                    dimensions.push({
                        name: key,
                        weight: 0, // 权重未知，设为0
                        maxScore: 100, // 假设满分100
                        score: score
                    });
                }
            }
        });

        return dimensions;
    }

    /**
     * 解析CSV行
     * @param {string} line - CSV行
     * @returns {Array} 解析后的字段数组
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // 跳过下一个引号
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * 读取文件为文本
     * @param {File} file - 文件对象
     * @returns {Promise<string>} 文件内容
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * 获取文件扩展名
     * @param {string} filename - 文件名
     * @returns {string} 扩展名
     */
    getFileExtension(filename) {
        return filename.substring(filename.lastIndexOf('.')).toLowerCase();
    }

    /**
     * 添加到导入历史
     * @param {Object} entry - 记录项
     */
    addToHistory(entry) {
        this.importHistory.push(entry);
        
    }

    /**
     * 获取导入历史
     * @returns {Array} 历史记录
     */
    getImportHistory() {
        return [...this.importHistory];
    }

    /**
     * 清空导入历史
     */
    clearHistory() {
        this.importHistory = [];
        
    }

    /**
     * 设置导入成功回调
     * @param {Function} callback - 回调函数
     */
    setOnImportSuccess(callback) {
        this.onImportSuccess = callback;
    }

    /**
     * 获取支持的文件格式
     * @returns {Array} 格式列表
     */
    getSupportedFormats() {
        return [...this.supportedFormats];
    }

    /**
     * 获取当前导入数据
     * @returns {Object} 当前数据
     */
    getCurrentData() {
        return this.currentImportData;
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