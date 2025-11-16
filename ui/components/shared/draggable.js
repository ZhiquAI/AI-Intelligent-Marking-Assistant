/**
 * Draggable - 拖拽功能组件
 * 提供强大的拖拽功能，支持边界限制、事件回调、拖拽约束等
 */

/**
 * 全局拖拽状态
 */
export const dragState = {
    isDragging: false,
    currentElement: null,
    startX: 0,
    startY: 0,
    dragStartTime: 0
};

/**
 * 拖拽管理器类
 */
export class DraggableManager {
    constructor(options = {}) {
        this.options = {
            handle: null,
            containment: 'viewport', // 'viewport', 'parent', 'document' 或 DOM元素
            axis: 'both', // 'x', 'y', 'both'
            cursor: 'move',
            delay: 0, // 拖拽延迟（毫秒）
            distance: 3, // 开始拖拽的最小距离
            disabled: false,
            zIndex: null,
            opacity: 0.8,
            snapToGrid: false,
            gridStep: 1,
            onDragStart: null,
            onDrag: null,
            onDragEnd: null,
            ...options
        };

        this.elements = new Map();
        this.activeDraggable = null;
        this.bindedEvents = new Set();
    }

    /**
     * 使元素可拖拽
     * @param {HTMLElement} element - 要拖拽的元素
     * @param {Object} options - 覆盖默认选项
     * @returns {Function} 清理函数
     */
    makeDraggable(element, options = {}) {
        if (!element || typeof element !== 'object') {
            console.error('Draggable: 无效的元素', element);
            return () => {};
        }

        const elementOptions = { ...this.options, ...options };
        const draggableId = this.generateId();

        // 初始化元素样式
        this.initializeElement(element, elementOptions);

        // 存储拖拽数据
        this.elements.set(draggableId, {
            element,
            options: elementOptions,
            isActive: false,
            startX: 0,
            startY: 0,
            initialX: 0,
            initialY: 0,
            moved: false
        });

        // 绑定事件
        const cleanupFunctions = this.bindEvents(draggableId, element, elementOptions);

        // 返回清理函数
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
            this.elements.delete(draggableId);
        };
    }

    /**
     * 初始化元素样式
     */
    initializeElement(element, options) {
        // 确保元素有定位属性
        if (['static', 'relative'].includes(element.style.position)) {
            element.style.position = 'fixed';
        }

        // 设置初始位置
        if (element.style.left === '' && element.style.right === '') {
            const rect = element.getBoundingClientRect();
            element.style.left = rect.left + 'px';
            element.style.top = rect.top + 'px';
        }

        // 设置其他样式
        if (options.cursor) {
            const handle = options.handle ? element.querySelector(options.handle) : element;
            if (handle) {
                handle.style.cursor = options.cursor;
            }
        }
    }

    /**
     * 绑定事件
     */
    bindEvents(draggableId, element, options) {
        const handle = options.handle ? element.querySelector(options.handle) : element;
        const cleanupFunctions = [];

        // 鼠标事件
        const startMouse = (e) => this.onStart(e, draggableId, 'mouse');
        const moveMouse = (e) => this.onMove(e, draggableId, 'mouse');
        const endMouse = (e) => this.onEnd(e, draggableId, 'mouse');

        // 触摸事件
        const startTouch = (e) => this.onStart(e, draggableId, 'touch');
        const moveTouch = (e) => this.onMove(e, draggableId, 'touch');
        const endTouch = (e) => this.onEnd(e, draggableId, 'touch');

        // 绑定开始事件
        handle.addEventListener('mousedown', startMouse);
        handle.addEventListener('touchstart', startTouch, { passive: true });

        cleanupFunctions.push(() => {
            handle.removeEventListener('mousedown', startMouse);
            handle.removeEventListener('touchstart', startTouch);
        });

        // 动态绑定移动和结束事件
        const bindDynamicEvents = () => {
            if (!this.bindedEvents.has('mouse')) {
                document.addEventListener('mousemove', moveMouse);
                document.addEventListener('mouseup', endMouse);
                this.bindedEvents.add('mouse');

                cleanupFunctions.push(() => {
                    document.removeEventListener('mousemove', moveMouse);
                    document.removeEventListener('mouseup', endMouse);
                    this.bindedEvents.delete('mouse');
                });
            }

            if (!this.bindedEvents.has('touch')) {
                document.addEventListener('touchmove', moveTouch, { passive: false });
                document.addEventListener('touchend', endTouch);
                this.bindedEvents.add('touch');

                cleanupFunctions.push(() => {
                    document.removeEventListener('touchmove', moveTouch);
                    document.removeEventListener('touchend', endTouch);
                    this.bindedEvents.delete('touch');
                });
            }
        };

        this.elements.get(draggableId).bindDynamicEvents = bindDynamicEvents;

        return cleanupFunctions;
    }

    /**
     * 处理拖拽开始
     */
    onStart(e, draggableId, eventType) {
        if (this.options.disabled) return;

        const draggableData = this.elements.get(draggableId);
        if (!draggableData) return;

        const point = this.getEventPoint(e, eventType);

        // 检查延迟
        if (this.options.delay > 0) {
            setTimeout(() => {
                if (this.elements.has(draggableId) && !draggableData.moved) {
                    this.startDragging(e, draggableId, point);
                }
            }, this.options.delay);
        } else {
            this.startDragging(e, draggableId, point);
        }
    }

    /**
     * 开始拖拽
     */
    startDragging(e, draggableId, point) {
        const draggableData = this.elements.get(draggableId);
        if (!draggableData) return;

        const { element, options } = draggableData;
        const rect = element.getBoundingClientRect();

        // 设置拖拽状态
        draggableData.isActive = true;
        draggableData.startX = point.clientX;
        draggableData.startY = point.clientY;
        draggableData.initialX = rect.left;
        draggableData.initialY = rect.top;
        draggableData.moved = false;

        // 设置全局状态
        this.activeDraggable = draggableId;
        dragState.isDragging = true;
        dragState.currentElement = element;
        dragState.startX = point.clientX;
        dragState.startY = point.clientY;
        dragState.dragStartTime = Date.now();

        // 应用拖拽样式
        if (options.zIndex) {
            element.style.zIndex = options.zIndex;
        }
        if (options.opacity < 1) {
            element.style.opacity = options.opacity;
        }

        // 绑定动态事件
        if (draggableData.bindDynamicEvents) {
            draggableData.bindDynamicEvents();
        }

        // 触发回调
        this.triggerCallback(options.onDragStart, {
            element,
            event: e,
            clientX: point.clientX,
            clientY: point.clientY,
            initialX: draggableData.initialX,
            initialY: draggableData.initialY
        });

        // 派发事件
        element.dispatchEvent(new CustomEvent('dragstart', {
            detail: { clientX: point.clientX, clientY: point.clientY }
        }));
    }

    /**
     * 处理拖拽移动
     */
    onMove(e, draggableId, eventType) {
        if (!this.activeDraggable || this.activeDraggable !== draggableId) return;

        const draggableData = this.elements.get(draggableId);
        if (!draggableData || !draggableData.isActive) return;

        // 阻止默认行为
        if (eventType === 'touch') {
            e.preventDefault();
        }

        const point = this.getEventPoint(e, eventType);
        const { element, options } = draggableData;

        // 计算移动距离
        const dx = point.clientX - draggableData.startX;
        const dy = point.clientY - draggableData.startY;

        // 检查最小移动距离
        if (!draggableData.moved && Math.abs(dx) < options.distance && Math.abs(dy) < options.distance) {
            return;
        }

        draggableData.moved = true;

        // 计算新位置
        let newX = draggableData.initialX + dx;
        let newY = draggableData.initialY + dy;

        // 应用轴约束
        if (options.axis === 'x') {
            newY = draggableData.initialY;
        } else if (options.axis === 'y') {
            newX = draggableData.initialX;
        }

        // 网格吸附
        if (options.snapToGrid) {
            newX = Math.round(newX / options.gridStep) * options.gridStep;
            newY = Math.round(newY / options.gridStep) * options.gridStep;
        }

        // 应用边界约束
        const boundedPosition = this.applyContainment(newX, newY, element, options);
        newX = boundedPosition.x;
        newY = boundedPosition.y;

        // 更新元素位置
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';

        // 触发回调
        this.triggerCallback(options.onDrag, {
            element,
            event: e,
            clientX: point.clientX,
            clientY: point.clientY,
            x: newX,
            y: newY,
            dx,
            dy
        });

        // 派发事件
        element.dispatchEvent(new CustomEvent('drag', {
            detail: { x: newX, y: newY, dx, dy }
        }));
    }

    /**
     * 处理拖拽结束
     */
    onEnd(e, draggableId, eventType) {
        if (!this.activeDraggable || this.activeDraggable !== draggableId) return;

        const draggableData = this.elements.get(draggableId);
        if (!draggableData || !draggableData.isActive) return;

        const { element, options } = draggableData;
        const point = this.getEventPoint(e, eventType);

        // 恢复样式
        if (options.opacity < 1) {
            element.style.opacity = '';
        }
        if (options.zIndex) {
            element.style.zIndex = '';
        }

        // 重置状态
        draggableData.isActive = false;
        this.activeDraggable = null;
        dragState.isDragging = false;
        dragState.currentElement = null;

        // 延迟重置拖拽状态，防止点击事件触发
        setTimeout(() => {
            dragState.isDragging = false;
        }, 50);

        // 触发回调
        this.triggerCallback(options.onDragEnd, {
            element,
            event: e,
            clientX: point.clientX,
            clientY: point.clientY,
            moved: draggableData.moved
        });

        // 派发事件
        element.dispatchEvent(new CustomEvent('dragend', {
            detail: { moved: draggableData.moved }
        }));
    }

    /**
     * 应用边界约束
     */
    applyContainment(x, y, element, options) {
        let bounds = { minX: 0, minY: 0, maxX: window.innerWidth, maxY: window.innerHeight };

        if (options.containment === 'parent' && element.parentElement) {
            const parentRect = element.parentElement.getBoundingClientRect();
            bounds = {
                minX: parentRect.left,
                minY: parentRect.top,
                maxX: parentRect.right,
                maxY: parentRect.bottom
            };
        } else if (options.containment instanceof HTMLElement) {
            const rect = options.containment.getBoundingClientRect();
            bounds = {
                minX: rect.left,
                minY: rect.top,
                maxX: rect.right,
                maxY: rect.bottom
            };
        }

        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;

        return {
            x: Math.max(bounds.minX, Math.min(x, bounds.maxX - elementWidth)),
            y: Math.max(bounds.minY, Math.min(y, bounds.maxY - elementHeight))
        };
    }

    /**
     * 获取事件坐标
     */
    getEventPoint(e, eventType) {
        if (eventType === 'touch' && e.touches && e.touches.length > 0) {
            return {
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            };
        }
        return {
            clientX: e.clientX,
            clientY: e.clientY
        };
    }

    /**
     * 触发回调函数
     */
    triggerCallback(callback, data) {
        if (typeof callback === 'function') {
            try {
                callback(data);
            } catch (error) {
                console.error('Draggable 回调执行失败:', error);
            }
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return `draggable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 禁用拖拽
     */
    disable(draggableId) {
        const draggableData = this.elements.get(draggableId);
        if (draggableData) {
            draggableData.options.disabled = true;
        }
    }

    /**
     * 启用拖拽
     */
    enable(draggableId) {
        const draggableData = this.elements.get(draggableId);
        if (draggableData) {
            draggableData.options.disabled = false;
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.elements.clear();
        this.activeDraggable = null;
        this.bindedEvents.clear();
    }
}

// 创建全局拖拽管理器实例
export const globalDragManager = new DraggableManager();

/**
 * 便捷函数：使元素可拖拽
 * @param {HTMLElement} element - 要拖拽的元素
 * @param {Object} options - 选项
 * @returns {Function} 清理函数
 */
export function makeDraggable(element, options = {}) {
    return globalDragManager.makeDraggable(element, options);
}

/**
 * 便捷函数：创建文件拖拽区域
 * @param {HTMLElement} dropZone - 拖拽区域
 * @param {Object} options - 选项
 * @returns {Function} 清理函数
 */
export function makeDropZone(dropZone, options = {}) {
    const defaultOptions = {
        dragOverClass: 'drag-over',
        acceptedTypes: ['Files'],
        onDrop: null,
        onDragOver: null,
        onDragLeave: null,
        onDragEnter: null,
        ...options
    };

    // 防止默认拖拽行为
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // 高亮拖拽区域
    const highlight = () => {
        dropZone.classList.add(defaultOptions.dragOverClass);
    };

    // 取消高亮
    const unhighlight = () => {
        dropZone.classList.remove(defaultOptions.dragOverClass);
    };

    // 处理文件拖放
    const handleDrop = (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        triggerCallback(defaultOptions.onDrop, {
            files: Array.from(files),
            event: e
        });
    };

    // 触发回调
    const triggerCallback = (callback, data) => {
        if (typeof callback === 'function') {
            try {
                callback(data);
            } catch (error) {
                console.error('DropZone 回调执行失败:', error);
            }
        }
    };

    // 绑定事件
    const events = [
        ['dragenter', preventDefaults],
        ['dragover', preventDefaults],
        ['dragleave', preventDefaults],
        ['drop', preventDefaults],
        ['dragenter', highlight],
        ['dragover', highlight],
        ['dragleave', unhighlight],
        ['drop', unhighlight],
        ['drop', handleDrop]
    ];

    events.forEach(([event, handler]) => {
        dropZone.addEventListener(event, handler);
    });

    // 返回清理函数
    return () => {
        events.forEach(([event, handler]) => {
            dropZone.removeEventListener(event, handler);
        });
        unhighlight();
    };
}

export default {
    DraggableManager,
    makeDraggable,
    makeDropZone,
    dragState,
    globalDragManager
};