/**
 * 智学AI - 拖拽功能管理器
 * 统一管理应用中所有可拖拽元素的拖拽行为
 */

import { EventEmitter } from '../utils/event-manager.js';
import { DraggableManager } from './shared/draggable.js';
import { validateData, escapeHtml } from '../utils/security-utils.js';
import { safeCreateElement } from '../utils/safe-html.js';

export class DragManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            enableTouchSupport: true,
            enableKeyboardSupport: true,
            defaultConstraints: 'viewport',
            snapToGrid: false,
            gridSize: 10,
            zIndex: 2147483645,
            dragHandleClass: 'drag-handle',
            dragStartThreshold: 3,
            animationDuration: 300,
            autoSavePosition: true,
            storageKey: 'zhixue-positions',
            ...options
        };

        // 拖拽实例管理
        this.draggables = new Map();
        this.activeDraggables = new Set();
        this.globalState = {
            isDragging: false,
            currentDraggable: null,
            dragStartPosition: null,
            originalPositions: new Map()
        };

        // 约束和边界
        this.constraints = new Map();
        this.dropZones = new Map();

        // 历史记录
        this.positionHistory = new Map();
        this.undoStack = [];
        this.redoStack = [];

        // 初始化
        this.init();
    }

    init() {
        try {
            console.log('拖拽管理器初始化中...');
            this.setupGlobalEventListeners();
            this.loadSavedPositions();
            this.setupKeyboardShortcuts();
            console.log('拖拽管理器初始化完成');
            this.emit('initialized');
        } catch (error) {
            console.error('拖拽管理器初始化失败:', error);
            this.emit('error', error);
        }
    }

    /**
     * 注册可拖拽元素
     * @param {string} id - 拖拽元素ID
     * @param {HTMLElement} element - 拖拽元素
     * @param {Object} options - 拖拽选项
     */
    register(id, element, options = {}) {
        const validation = validateData({ id, element }, 'object');
        if (!validation.valid) {
            throw new Error(`拖拽注册参数无效: ${validation.error}`);
        }

        if (this.draggables.has(id)) {
            console.warn(`拖拽元素 ${id} 已存在，将被覆盖`);
            this.unregister(id);
        }

        const draggableOptions = {
            containment: options.containment || this.options.defaultConstraints,
            axis: options.axis || 'both',
            handle: options.handle || null,
            cursor: options.cursor || 'grab',
            distance: options.distance || this.options.dragStartThreshold,
            zIndex: options.zIndex || this.options.zIndex,
            onDragStart: (pos, event) => this.handleDragStart(id, pos, event),
            onDrag: (pos, event) => this.handleDrag(id, pos, event),
            onDragEnd: (pos, event) => this.handleDragEnd(id, pos, event),
            snapToGrid: options.snapToGrid ?? this.options.snapToGrid,
            gridSize: options.gridSize || this.options.gridSize,
            constraints: options.constraints || null,
            revert: options.revert || false,
            revertDuration: options.revertDuration || this.options.animationDuration,
            ...options
        };

        const draggable = new DraggableManager(element, draggableOptions);

        this.draggables.set(id, {
            id,
            element,
            draggable,
            options: draggableOptions,
            savedPosition: this.getSavedPosition(id)
        });

        // 恢复保存的位置
        if (this.options.autoSavePosition && draggableOptions.restorePosition !== false) {
            this.restorePosition(id);
        }

        // 添加拖拽手柄样式
        this.addDragHandleStyles(element, options.handle);

        this.emit('registered', { id, element, options });
        return id;
    }

    /**
     * 注销拖拽元素
     * @param {string} id - 拖拽元素ID
     */
    unregister(id) {
        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) {
            console.warn(`拖拽元素 ${id} 不存在`);
            return;
        }

        // 停止拖拽
        if (this.globalState.currentDraggable === id) {
            draggableInfo.draggable.stop();
        }

        // 销毁拖拽实例
        draggableInfo.draggable.destroy();

        // 移除保存的位置
        this.positionHistory.delete(id);

        // 从映射中移除
        this.draggables.delete(id);

        this.emit('unregistered', { id });
    }

    /**
     * 设置约束条件
     * @param {string} id - 拖拽元素ID
     * @param {Object} constraint - 约束条件
     */
    setConstraint(id, constraint) {
        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return;

        this.constraints.set(id, constraint);
        draggableInfo.draggable.updateOptions({ constraints: constraint });
        this.emit('constraintChanged', { id, constraint });
    }

    /**
     * 设置放置区域
     * @param {string} zoneId - 放置区域ID
     * @param {HTMLElement} zoneElement - 放置区域元素
     * @param {Object} options - 放置区域选项
     */
    setDropZone(zoneId, zoneElement, options = {}) {
        const dropZone = {
            id: zoneId,
            element: zoneElement,
            options: {
                accept: options.accept || '*', // 接受的拖拽元素类型
                onDrop: options.onDrop || null,
                onEnter: options.onEnter || null,
                onLeave: options.onLeave || null,
                highlight: options.highlight !== false,
                highlightClass: options.highlightClass || 'drop-zone-active',
                ...options
            },
            isActive: false
        };

        this.dropZones.set(zoneId, dropZone);
        this.setupDropZoneEvents(dropZone);
        this.emit('dropZoneCreated', { zoneId, dropZone });
        return zoneId;
    }

    /**
     * 设置放置区域事件
     * @param {Object} dropZone - 放置区域对象
     */
    setupDropZoneEvents(dropZone) {
        const element = dropZone.element;

        const handleDragEnter = (event) => {
            if (!this.globalState.isDragging) return;

            const draggableId = this.globalState.currentDraggable;
            const draggableInfo = this.draggables.get(draggableId);

            if (!draggableInfo) return;

            // 检查是否接受此拖拽元素
            if (this.isAcceptedDropZone(dropZone, draggableInfo)) {
                dropZone.isActive = true;

                if (dropZone.options.highlight) {
                    element.classList.add(dropZone.options.highlightClass);
                }

                if (dropZone.options.onEnter) {
                    dropZone.options.onEnter({
                        draggableId,
                        dropZoneId: dropZone.id,
                        element: draggableInfo.element,
                        dropElement: element
                    });
                }

                this.emit('dropZoneEnter', {
                    draggableId,
                    dropZoneId: dropZone.id,
                    dropZone
                });
            }
        };

        const handleDragLeave = (event) => {
            if (!dropZone.isActive) return;

            dropZone.isActive = false;

            if (dropZone.options.highlight) {
                element.classList.remove(dropZone.options.highlightClass);
            }

            if (dropZone.options.onLeave) {
                dropZone.options.onLeave({
                    draggableId: this.globalState.currentDraggable,
                    dropZoneId: dropZone.id,
                    element: dropZone.element
                });
            }

            this.emit('dropZoneLeave', {
                dropZoneId: dropZone.id,
                dropZone
            });
        };

        const handleDrop = (event) => {
            if (!dropZone.isActive) return;

            const draggableId = this.globalState.currentDraggable;
            const draggableInfo = this.draggables.get(draggableId);

            if (!draggableInfo) return;

            // 触发放置事件
            if (dropZone.options.onDrop) {
                dropZone.options.onDrop({
                    draggableId,
                    dropZoneId: dropZone.id,
                    element: draggableInfo.element,
                    dropElement: element,
                    position: this.globalState.dragStartPosition
                });
            }

            this.emit('dropped', {
                draggableId,
                dropZoneId: dropZone.id,
                position: this.globalState.dragStartPosition
            });

            handleDragLeave(event);
        };

        // 添加事件监听
        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);

        // 存储事件处理函数以便清理
        dropZone.eventHandlers = {
            dragEnter: handleDragEnter,
            dragLeave: handleDragLeave,
            drop: handleDrop
        };
    }

    /**
     * 检查是否接受放置区域
     * @param {Object} dropZone - 放置区域
     * @param {Object} draggableInfo - 拖拽信息
     * @returns {boolean} 是否接受
     */
    isAcceptedDropZone(dropZone, draggableInfo) {
        const accept = dropZone.options.accept;

        if (accept === '*') return true;

        if (typeof accept === 'string') {
            return draggableInfo.element.matches(accept);
        }

        if (Array.isArray(accept)) {
            return accept.some(selector => draggableInfo.element.matches(selector));
        }

        if (typeof accept === 'function') {
            return accept(draggableInfo.element);
        }

        return false;
    }

    /**
     * 拖拽开始处理
     * @param {string} id - 拖拽元素ID
     * @param {Object} position - 位置信息
     * @param {Event} event - 事件对象
     */
    handleDragStart(id, position, event) {
        this.globalState.isDragging = true;
        this.globalState.currentDraggable = id;
        this.globalState.dragStartPosition = position;

        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return;

        // 保存原始位置
        this.globalState.originalPositions.set(id, { ...position });

        // 添加到活动集合
        this.activeDraggables.add(id);

        // 应用拖拽样式
        draggableInfo.element.classList.add('dragging');

        // 提升z-index
        draggableInfo.element.style.zIndex = String(this.options.zIndex + 1);

        this.emit('dragStart', { id, position, event });
    }

    /**
     * 拖拽中处理
     * @param {string} id - 拖拽元素ID
     * @param {Object} position - 位置信息
     * @param {Event} event - 事件对象
     */
    handleDrag(id, position, event) {
        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return;

        // 检查放置区域
        this.checkDropZones(position);

        this.emit('drag', { id, position, event });
    }

    /**
     * 拖拽结束处理
     * @param {string} id - 拖拽元素ID
     * @param {Object} position - 位置信息
     * @param {Event} event - 事件对象
     */
    handleDragEnd(id, position, event) {
        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return;

        // 检查是否在有效放置区域内
        const dropZone = this.getActiveDropZone();

        if (dropZone) {
            // 触发放置事件
            this.triggerDropZone(dropZone, id, position, event);
        } else {
            // 检查是否启用了位置保存
            if (this.options.autoSavePosition) {
                this.savePosition(id, position);
            }
        }

        // 清理拖拽状态
        this.globalState.isDragging = false;
        this.globalState.currentDraggable = null;
        this.globalState.dragStartPosition = null;

        this.activeDraggables.delete(id);

        // 移除拖拽样式
        draggableInfo.element.classList.remove('dragging');

        // 恢复z-index
        draggableInfo.element.style.zIndex = '';

        // 保存到历史记录
        this.saveToHistory(id, position);

        this.emit('dragEnd', { id, position, event, dropZone });
    }

    /**
     * 检查放置区域
     * @param {Object} position - 当前位置
     */
    checkDropZones(position) {
        const draggableId = this.globalState.currentDraggable;

        this.dropZones.forEach(dropZone => {
            const element = dropZone.element;
            const rect = element.getBoundingClientRect();

            const isOver = position.clientX >= rect.left &&
                         position.clientX <= rect.right &&
                         position.clientY >= rect.top &&
                         position.clientY <= rect.bottom;

            if (isOver && !dropZone.isActive) {
                // 进入放置区域
                dropZone.isActive = true;
                element.classList.add(dropZone.options.highlightClass);

                if (dropZone.options.onEnter) {
                    dropZone.options.onEnter({
                        draggableId,
                        dropZoneId: dropZone.id,
                        element: this.draggables.get(draggableId)?.element,
                        dropElement: element
                    });
                }
            } else if (!isOver && dropZone.isActive) {
                // 离开放置区域
                dropZone.isActive = false;
                element.classList.remove(dropZone.options.highlightClass);

                if (dropZone.options.onLeave) {
                    dropZone.options.onLeave({
                        draggableId,
                        dropZoneId: dropZone.id,
                        element: this.draggables.get(draggableId)?.element,
                        dropElement: element
                    });
                }
            }
        });
    }

    /**
     * 获取当前活动放置区域
     * @returns {Object|null} 放置区域对象
     */
    getActiveDropZone() {
        for (const dropZone of this.dropZones.values()) {
            if (dropZone.isActive) {
                return dropZone;
            }
        }
        return null;
    }

    /**
     * 触发放置区域事件
     * @param {Object} dropZone - 放置区域
     * @param {string} draggableId - 拖拽元素ID
     * @param {Object} position - 位置
     * @param {Event} event - 事件
     */
    triggerDropZone(dropZone, draggableId, position, event) {
        const draggableInfo = this.draggables.get(draggableId);

        if (dropZone.options.onDrop) {
            dropZone.options.onDrop({
                draggableId,
                dropZoneId: dropZone.id,
                element: draggableInfo?.element,
                dropElement: dropZone.element,
                position,
                event
            });
        }

        // 清理放置区域状态
        dropZone.isActive = false;
        dropZone.element.classList.remove(dropZone.options.highlightClass);
    }

    /**
     * 保存位置
     * @param {string} id - 元素ID
     * @param {Object} position - 位置信息
     */
    savePosition(id, position) {
        if (!this.options.autoSavePosition) return;

        this.positionHistory.set(id, {
            ...position,
            timestamp: Date.now()
        });

        this.emit('positionSaved', { id, position });
    }

    /**
     * 恢复位置
     * @param {string} id - 元素ID
     */
    restorePosition(id) {
        const position = this.positionHistory.get(id);
        if (!position) return;

        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return;

        const element = draggableInfo.element;
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;

        this.emit('positionRestored', { id, position });
    }

    /**
     * 保存到历史记录
     * @param {string} id - 元素ID
     * @param {Object} position - 位置信息
     */
    saveToHistory(id, position) {
        const historyEntry = {
            id,
            position: { ...position },
            timestamp: Date.now()
        };

        // 添加到撤销栈
        this.undoStack.push(historyEntry);

        // 清空重做栈
        this.redoStack = [];

        // 限制历史记录大小
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
    }

    /**
     * 撤销操作
     */
    undo() {
        if (this.undoStack.length === 0) return;

        const entry = this.undoStack.pop();
        const draggableInfo = this.draggables.get(entry.id);

        if (!draggableInfo) return;

        // 保存当前位置到重做栈
        const currentPos = this.getCurrentPosition(entry.id);
        if (currentPos) {
            this.redoStack.push({
                id: entry.id,
                position: currentPos,
                timestamp: Date.now()
            });
        }

        // 恢复到历史位置
        this.animateToPosition(entry.id, entry.position);
        this.emit('undo', entry);
    }

    /**
     * 重做操作
     */
    redo() {
        if (this.redoStack.length === 0) return;

        const entry = this.redoStack.pop();
        const draggableInfo = this.draggables.get(entry.id);

        if (!draggableInfo) return;

        // 保存当前位置到撤销栈
        const currentPos = this.getCurrentPosition(entry.id);
        if (currentPos) {
            this.undoStack.push({
                id: entry.id,
                position: currentPos,
                timestamp: Date.now()
            });
        }

        // 移动到新位置
        this.animateToPosition(entry.id, entry.position);
        this.emit('redo', entry);
    }

    /**
     * 获取当前位置
     * @param {string} id - 元素ID
     * @returns {Object|null} 位置信息
     */
    getCurrentPosition(id) {
        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return null;

        const element = draggableInfo.element;
        const rect = element.getBoundingClientRect();

        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY
        };
    }

    /**
     * 动画移动到位置
     * @param {string} id - 元素ID
     * @param {Object} position - 目标位置
     */
    animateToPosition(id, position) {
        const draggableInfo = this.draggables.get(id);
        if (!draggableInfo) return;

        const element = draggableInfo.element;
        const currentPos = this.getCurrentPosition(id);

        if (!currentPos) return;

        // 应用过渡动画
        element.style.transition = `all ${this.options.animationDuration}ms ease-out`;

        // 设置新位置
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;

        // 移除过渡
        setTimeout(() => {
            element.style.transition = '';
        }, this.options.animationDuration);
    }

    /**
     * 重置所有位置
     */
    resetAllPositions() {
        this.draggables.forEach((draggableInfo, id) => {
            const element = draggableInfo.element;
            element.style.left = '';
            element.style.top = '';
            element.style.transform = '';
        });

        this.positionHistory.clear();
        this.undoStack = [];
        this.redoStack = [];

        if (this.options.autoSavePosition) {
            this.clearSavedPositions();
        }

        this.emit('allPositionsReset');
    }

    /**
     * 对齐到网格
     * @param {Object} position - 位置
     * @param {number} gridSize - 网格大小
     * @returns {Object} 对齐后的位置
     */
    snapToGrid(position, gridSize) {
        return {
            x: Math.round(position.x / gridSize) * gridSize,
            y: Math.round(position.y / gridSize) * gridSize
        };
    }

    /**
     * 添加拖拽手柄样式
     * @param {HTMLElement} element - 元素
     * @param {string|HTMLElement|null} handle - 手柄元素或选择器
     */
    addDragHandleStyles(element, handle) {
        if (!handle) {
            // 如果没有指定手柄，整个元素都可以拖拽
            element.style.cursor = 'grab';
            element.classList.add('draggable');
            return;
        }

        let handleElement = handle;
        if (typeof handle === 'string') {
            handleElement = element.querySelector(handle);
        }

        if (handleElement) {
            handleElement.style.cursor = 'grab';
            handleElement.classList.add(this.options.dragHandleClass);
        }
    }

    /**
     * 设置全局事件监听
     */
    setupGlobalEventListeners() {
        // 阻止默认拖拽行为
        document.addEventListener('dragstart', (event) => {
            if (event.target.closest('.draggable')) {
                event.preventDefault();
            }
        });

        // ESC键取消拖拽
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.globalState.isDragging) {
                this.cancelDrag();
            }
        });

        // 防止文本选择
        document.addEventListener('selectstart', (event) => {
            if (this.globalState.isDragging) {
                event.preventDefault();
            }
        });
    }

    /**
     * 取消当前拖拽
     */
    cancelDrag() {
        if (!this.globalState.isDragging || !this.globalState.currentDraggable) return;

        const draggableInfo = this.draggables.get(this.globalState.currentDraggable);
        if (!draggableInfo) return;

        // 恢复到原始位置
        const originalPos = this.globalState.originalPositions.get(this.globalState.currentDraggable);
        if (originalPos) {
            this.animateToPosition(this.globalState.currentDraggable, originalPos);
        }

        // 停止拖拽
        draggableInfo.draggable.stop();

        this.emit('dragCancelled', { id: this.globalState.currentDraggable });
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        if (!this.options.enableKeyboardSupport) return;

        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Z 撤销
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                this.undo();
            }

            // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y 重做
            if ((event.ctrlKey || event.metaKey) &&
                ((event.shiftKey && event.key === 'z') || event.key === 'y')) {
                event.preventDefault();
                this.redo();
            }
        });
    }

    /**
     * 加载保存的位置
     */
    loadSavedPositions() {
        if (!this.options.autoSavePosition) return;

        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                const positions = JSON.parse(saved);
                Object.entries(positions).forEach(([id, position]) => {
                    this.positionHistory.set(id, position);
                });
            }
        } catch (error) {
            console.error('加载保存的位置失败:', error);
        }
    }

    /**
     * 保存位置到存储
     */
    savePositions() {
        if (!this.options.autoSavePosition) return;

        try {
            const positions = {};
            this.positionHistory.forEach((position, id) => {
                positions[id] = position;
            });
            localStorage.setItem(this.options.storageKey, JSON.stringify(positions));
        } catch (error) {
            console.error('保存位置失败:', error);
        }
    }

    /**
     * 清除保存的位置
     */
    clearSavedPositions() {
        if (!this.options.autoSavePosition) return;

        try {
            localStorage.removeItem(this.options.storageKey);
        } catch (error) {
            console.error('清除保存的位置失败:', error);
        }
    }

    /**
     * 获取保存的位置
     * @param {string} id - 元素ID
     * @returns {Object|null} 保存的位置
     */
    getSavedPosition(id) {
        return this.positionHistory.get(id) || null;
    }

    /**
     * 设置选项
     * @param {Object} options - 新选项
     */
    setOptions(options) {
        Object.assign(this.options, options);

        // 更新所有拖拽实例的选项
        this.draggables.forEach((draggableInfo) => {
            draggableInfo.draggable.updateOptions({
                snapToGrid: this.options.snapToGrid,
                gridSize: this.options.gridSize
            });
        });
    }

    /**
     * 获取拖拽统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalDraggables: this.draggables.size,
            activeDraggables: this.activeDraggables.size,
            totalDropZones: this.dropZones.size,
            undoStackSize: this.undoStack.length,
            redoStackSize: this.redoStack.length,
            positionHistorySize: this.positionHistory.size,
            isDragging: this.globalState.isDragging
        };
    }

    /**
     * 销毁拖拽管理器
     */
    destroy() {
        // 注销所有拖拽元素
        [...this.draggables.keys()].forEach(id => {
            this.unregister(id);
        });

        // 清除放置区域
        this.dropZones.clear();

        // 清除数据
        this.positionHistory.clear();
        this.undoStack = [];
        this.redoStack = [];

        // 清除保存的位置
        if (this.options.autoSavePosition) {
            this.clearSavedPositions();
        }

        // 移除事件监听
        this.removeAllListeners();

        console.log('拖拽管理器已销毁');
    }
}

// 创建默认实例
export const defaultDragManager = new DragManager();

// 导出到全局
if (typeof window !== 'undefined' && process?.env?.NODE_ENV !== 'production') {
    window.DragManager = DragManager;
    window.defaultDragManager = defaultDragManager;
}

export default DragManager;