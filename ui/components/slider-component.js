/**
 * 智学AI - 滑块组件
 * 提供功能丰富的滑块控件，支持多种样式和交互方式
 */

import { EventEmitter } from '../utils/event-manager.js';
import { safeSetHTML, safeSetText, safeCreateElement } from '../utils/safe-html.js';
import { validateData, escapeHtml } from '../utils/security-utils.js';

export class SliderComponent extends EventEmitter {
    constructor(element, options = {}) {
        super();

        if (!element) {
            throw new Error('滑块组件需要一个有效的DOM元素');
        }

        this.element = element;
        this.container = null;
        this.track = null;
        this.thumb = null;
        this.valueDisplay = null;
        this.tooltip = null;

        // 默认选项
        this.options = {
            min: options.min ?? 0,
            max: options.max ?? 100,
            step: options.step ?? 1,
            value: options.value ?? 50,
            defaultValue: options.defaultValue ?? options.value ?? 50,
            orientation: options.orientation ?? 'horizontal', // horizontal, vertical
            size: options.size ?? 'normal', // small, normal, large
            theme: options.theme ?? 'default', // default, modern, minimal
            showValue: options.showValue ?? true,
            showTooltip: options.showTooltip ?? false,
            showScale: options.showScale ?? false,
            showRange: options.showRange ?? true,
            showLimits: options.showLimits ?? true,
            snapToPoints: options.snapToPoints ?? false,
            points: options.points || [],
            disabled: options.disabled ?? false,
            readonly: options.readonly ?? false,
            formatValue: options.formatValue || this.defaultFormatter,
            color: options.color || 'primary',
            animationDuration: options.animationDuration ?? 300,
            easing: options.easing || 'ease-out',
            label: options.label || '',
            description: options.description || '',
            unit: options.unit || '',
            precision: options.precision ?? 0,
            ...options
        };

        // 状态管理
        this.isDragging = false;
        this.isHovered = false;
        this.currentValue = this.options.value;
        this.previousValue = this.options.value;
        this.isFocused = false;

        // 触摸和鼠标事件
        this.startX = 0;
        this.startY = 0;
        this.startValue = 0;
        this.dragStartValue = 0;

        // 动画
        this.animationFrame = null;
        this.animationStartTime = null;
        this.animationStartValue = 0;
        this.animationTargetValue = 0;

        // 验证选项
        this.validateOptions();

        // 初始化
        this.init();
    }

    init() {
        try {
            console.log('滑块组件初始化中...');

            // 创建滑块结构
            this.createSlider();

            // 设置事件监听
            this.setupEventListeners();

            // 初始化状态
            this.updateValue(this.options.value, false);

            console.log('滑块组件初始化完成');
            this.emit('initialized', { value: this.currentValue });

        } catch (error) {
            console.error('滑块组件初始化失败:', error);
            this.emit('error', error);
        }
    }

    validateOptions() {
        const { min, max, step, value, defaultValue } = this.options;

        if (min >= max) {
            throw new Error('最小值必须小于最大值');
        }

        if (step <= 0) {
            throw new Error('步长必须大于0');
        }

        if (value < min || value > max) {
            this.options.value = Math.max(min, Math.min(max, value));
        }

        if (defaultValue < min || defaultValue > max) {
            this.options.defaultValue = Math.max(min, Math.min(max, defaultValue));
        }

        // 验证刻度点
        this.options.points = this.options.points.filter(point =>
            point >= min && point <= max
        ).sort((a, b) => a - b);
    }

    createSlider() {
        const sliderHTML = `
            <div class="slider-container ${this.getContainerClasses()}" ${this.getAttributes()}>
                ${this.options.label ? `
                    <div class="slider-label">
                        <span class="label-text">${escapeHtml(this.options.label)}</span>
                        ${this.options.description ? `
                            <span class="label-description">${escapeHtml(this.options.description)}</span>
                        ` : ''}
                    </div>
                ` : ''}

                <div class="slider-wrapper ${this.options.orientation}">
                    ${this.options.showRange ? `
                        <div class="slider-range">
                            <div class="range-min">${this.options.min}</div>
                            <div class="range-max">${this.options.max}</div>
                        </div>
                    ` : ''}

                    <div class="slider-track" data-ref="track">
                        <div class="slider-progress" data-ref="progress"></div>
                        ${this.renderScaleMarks()}
                        <div class="slider-thumb" data-ref="thumb">
                            <div class="thumb-handle"></div>
                            ${this.options.showTooltip ? `
                                <div class="slider-tooltip" data-ref="tooltip"></div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${this.options.showValue ? `
                    <div class="slider-value">
                        <span class="value-display" data-ref="valueDisplay"></span>
                        ${this.options.unit ? `<span class="value-unit">${escapeHtml(this.options.unit)}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        safeSetHTML(this.element, sliderHTML);

        // 缓存DOM元素
        this.cacheElements();

        // 应用初始样式
        this.applyStyles();
    }

    getContainerClasses() {
        const classes = [
            `orientation-${this.options.orientation}`,
            `size-${this.options.size}`,
            `theme-${this.options.theme}`,
            `color-${this.options.color}`
        ];

        if (this.options.disabled) classes.push('disabled');
        if (this.options.readonly) classes.push('readonly');
        if (this.options.showTooltip) classes.push('has-tooltip');
        if (this.options.showScale) classes.push('has-scale');
        if (this.options.snapToPoints) classes.push('snap-to-points');
        if (this.options.points.length > 0) classes.push('has-points');

        return classes.join(' ');
    }

    getAttributes() {
        const attributes = {
            'role': 'slider',
            'tabindex': this.options.disabled ? -1 : 0,
            'aria-valuemin': this.options.min,
            'aria-valuemax': this.options.max,
            'aria-valuenow': this.currentValue,
            'aria-disabled': this.options.disabled,
            'aria-readonly': this.options.readonly
        };

        if (this.options.label) {
            attributes['aria-label'] = this.options.label;
        }

        return Object.entries(attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');
    }

    renderScaleMarks() {
        if (!this.options.showScale || this.options.orientation === 'vertical') {
            return '';
        }

        const marks = [];
        const range = this.options.max - this.options.min;
        const markCount = Math.min(10, Math.floor(range / this.options.step));

        for (let i = 0; i <= markCount; i++) {
            const value = this.options.min + (i * range / markCount);
            const position = (i / markCount) * 100;

            marks.push(`
                <div class="scale-mark" style="left: ${position}%">
                    <div class="mark-line"></div>
                    ${i % 2 === 0 ? `<div class="mark-label">${value}</div>` : ''}
                </div>
            `);
        }

        return `<div class="slider-scale">${marks.join('')}</div>`;
    }

    cacheElements() {
        this.container = this.element.querySelector('.slider-container');
        this.track = this.element.querySelector('[data-ref="track"]');
        this.thumb = this.element.querySelector('[data-ref="thumb"]');
        this.progress = this.element.querySelector('[data-ref="progress"]');
        this.valueDisplay = this.element.querySelector('[data-ref="valueDisplay"]');
        this.tooltip = this.element.querySelector('[data-ref="tooltip"]');
    }

    applyStyles() {
        if (!this.track) return;

        // 设置CSS变量
        const cssVars = {
            '--slider-min': this.options.min,
            '--slider-max': this.options.max,
            '--slider-value': this.currentValue,
            '--slider-percentage': this.getPercentage(this.currentValue),
            '--slider-step': this.options.step,
            '--slider-color': `var(--${this.options.color}-500)`,
            '--slider-animation-duration': `${this.options.animationDuration}ms`
        };

        Object.entries(cssVars).forEach(([property, value]) => {
            this.track.style.setProperty(property, value);
        });

        // 如果有自定义刻度点，应用特殊样式
        if (this.options.points.length > 0) {
            this.applyPointsStyles();
        }
    }

    applyPointsStyles() {
        const pointsHTML = this.options.points.map(point => {
            const percentage = this.getPercentage(point);
            return `
                <div class="point-marker" style="left: ${percentage}%" data-point="${point}">
                    <div class="point-indicator"></div>
                    <div class="point-value">${point}</div>
                </div>
            `;
        }).join('');

        if (this.track) {
            const existingPoints = this.track.querySelector('.points-container');
            if (existingPoints) {
                safeSetHTML(existingPoints, pointsHTML);
            } else {
                const pointsContainer = safeCreateElement('div', {
                    className: 'points-container'
                });
                safeSetHTML(pointsContainer, pointsHTML);
                this.track.appendChild(pointsContainer);
            }
        }
    }

    setupEventListeners() {
        // 鼠标事件
        this.track.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // 触摸事件
        this.track.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // 键盘事件
        this.track.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.track.addEventListener('keyup', this.handleKeyUp.bind(this));

        // 焦点事件
        this.track.addEventListener('focus', this.handleFocus.bind(this));
        this.track.addEventListener('blur', this.handleBlur.bind(this));

        // 悬停事件
        this.track.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.track.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

        // 点击事件
        this.track.addEventListener('click', this.handleTrackClick.bind(this));

        // 双击重置
        this.track.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        // 防止右键菜单
        this.track.addEventListener('contextmenu', e => e.preventDefault());
    }

    handleMouseDown(event) {
        if (this.options.disabled || this.options.readonly) return;

        // 检查是否点击在滑块上
        if (event.target === this.thumb || this.thumb.contains(event.target)) {
            this.startDrag(event.clientX, event.clientY);
        }
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;

        event.preventDefault();
        this.updateDrag(event.clientX, event.clientY);
    }

    handleMouseUp(event) {
        if (!this.isDragging) return;

        this.endDrag();
    }

    handleTouchStart(event) {
        if (this.options.disabled || this.options.readonly) return;

        const touch = event.touches[0];

        // 检查是否触摸在滑块上
        const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        if (touchTarget === this.thumb || this.thumb.contains(touchTarget)) {
            event.preventDefault();
            this.startDrag(touch.clientX, touch.clientY);
        }
    }

    handleTouchMove(event) {
        if (!this.isDragging) return;

        event.preventDefault();
        const touch = event.touches[0];
        this.updateDrag(touch.clientX, touch.clientY);
    }

    handleTouchEnd(event) {
        if (!this.isDragging) return;

        event.preventDefault();
        this.endDrag();
    }

    startDrag(clientX, clientY) {
        this.isDragging = true;
        this.startX = clientX;
        this.startY = clientY;
        this.startValue = this.currentValue;
        this.dragStartValue = this.currentValue;

        // 添加拖拽状态类
        this.container.classList.add('dragging');

        // 防止文本选择
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        // 获取焦点
        this.track.focus();

        this.emit('dragStart', { value: this.currentValue });
    }

    updateDrag(clientX, clientY) {
        if (!this.isDragging) return;

        const rect = this.track.getBoundingClientRect();
        let percentage;

        if (this.options.orientation === 'horizontal') {
            percentage = (clientX - rect.left) / rect.width;
        } else {
            percentage = (rect.bottom - clientY) / rect.height;
        }

        percentage = Math.max(0, Math.min(1, percentage));
        let newValue = this.options.min + percentage * (this.options.max - this.options.min);

        // 应用步长
        newValue = this.snapToStep(newValue);

        // 如果启用了吸附到点
        if (this.options.snapToPoints) {
            newValue = this.snapToPoints(newValue);
        }

        this.updateValue(newValue, true);
    }

    endDrag() {
        if (!this.isDragging) return;

        this.isDragging = false;

        // 移除拖拽状态类
        this.container.classList.remove('dragging');

        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';

        this.emit('dragEnd', { value: this.currentValue });
    }

    handleKeyDown(event) {
        if (this.options.disabled || this.options.readonly) return;

        let newValue = this.currentValue;
        const step = this.options.step;
        let handled = false;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue = Math.max(this.options.min, this.currentValue - step);
                handled = true;
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newValue = Math.min(this.options.max, this.currentValue + step);
                handled = true;
                break;
            case 'Home':
                newValue = this.options.min;
                handled = true;
                break;
            case 'End':
                newValue = this.options.max;
                handled = true;
                break;
            case 'PageDown':
                newValue = Math.max(this.options.min, this.currentValue - step * 10);
                handled = true;
                break;
            case 'PageUp':
                newValue = Math.min(this.options.max, this.currentValue + step * 10);
                handled = true;
                break;
            case 'Enter':
            case ' ':
                this.animateToDefaultValue();
                handled = true;
                break;
        }

        if (handled) {
            event.preventDefault();
            this.updateValue(newValue, true);
        }
    }

    handleKeyUp(event) {
        // 可以在这里处理按键释放事件
    }

    handleFocus(event) {
        this.isFocused = true;
        this.container.classList.add('focused');
        this.emit('focus', { value: this.currentValue });
    }

    handleBlur(event) {
        this.isFocused = false;
        this.container.classList.remove('focused');
        this.emit('blur', { value: this.currentValue });
    }

    handleMouseEnter(event) {
        this.isHovered = true;
        this.container.classList.add('hovered');
        this.emit('hover', { value: this.currentValue });
    }

    handleMouseLeave(event) {
        this.isHovered = false;
        this.container.classList.remove('hovered');
        this.emit('leave', { value: this.currentValue });
    }

    handleTrackClick(event) {
        if (this.options.disabled || this.options.readonly) return;

        // 如果点击在滑块上，不处理
        if (event.target === this.thumb || this.thumb.contains(event.target)) {
            return;
        }

        const rect = this.track.getBoundingClientRect();
        let percentage;

        if (this.options.orientation === 'horizontal') {
            percentage = (event.clientX - rect.left) / rect.width;
        } else {
            percentage = (rect.bottom - event.clientY) / rect.height;
        }

        percentage = Math.max(0, Math.min(1, percentage));
        let newValue = this.options.min + percentage * (this.options.max - this.options.min);

        // 应用步长和吸附
        newValue = this.snapToStep(newValue);
        if (this.options.snapToPoints) {
            newValue = this.snapToPoints(newValue);
        }

        this.updateValue(newValue, true);

        // 添加点击动画
        this.addClickAnimation(percentage);
    }

    handleDoubleClick(event) {
        if (this.options.disabled || this.options.readonly) return;

        // 双击重置为默认值
        this.animateToDefaultValue();
    }

    snapToStep(value) {
        const { min, max, step } = this.options;
        const steps = Math.round((value - min) / step);
        return min + steps * step;
    }

    snapToPoints(value) {
        if (this.options.points.length === 0) return value;

        let closestPoint = value;
        let minDistance = Infinity;

        for (const point of this.options.points) {
            const distance = Math.abs(value - point);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        // 只有当距离足够近时才吸附
        const snapThreshold = (this.options.max - this.options.min) * 0.05; // 5%的阈值
        return minDistance < snapThreshold ? closestPoint : value;
    }

    updateValue(value, animate = false) {
        const oldValue = this.currentValue;
        const clampedValue = Math.max(this.options.min, Math.min(this.options.max, value));

        if (clampedValue === oldValue) return;

        this.previousValue = oldValue;
        this.currentValue = clampedValue;

        if (animate) {
            this.animateValue(oldValue, clampedValue);
        } else {
            this.setVisualValue(clampedValue);
        }

        // 更新ARIA属性
        this.track.setAttribute('aria-valuenow', clampedValue);

        // 更新CSS变量
        this.track.style.setProperty('--slider-value', clampedValue);
        this.track.style.setProperty('--slider-percentage', this.getPercentage(clampedValue));

        this.emit('change', {
            value: clampedValue,
            oldValue,
            userInitiated: this.isDragging || animate
        });
    }

    setVisualValue(value) {
        const percentage = this.getPercentage(value);

        // 更新进度条
        if (this.progress) {
            if (this.options.orientation === 'horizontal') {
                this.progress.style.width = `${percentage}%`;
            } else {
                this.progress.style.height = `${percentage}%`;
            }
        }

        // 更新滑块位置
        if (this.thumb) {
            if (this.options.orientation === 'horizontal') {
                this.thumb.style.left = `${percentage}%`;
            } else {
                this.thumb.style.bottom = `${percentage}%`;
            }
        }

        // 更新显示值
        if (this.valueDisplay) {
            const formattedValue = this.options.formatValue(value);
            safeSetText(this.valueDisplay, formattedValue);
        }

        // 更新工具提示
        if (this.tooltip) {
            const formattedValue = this.options.formatValue(value);
            safeSetText(this.tooltip, formattedValue);
        }

        // 更新状态指示器
        this.updateStateIndicators(value);
    }

    animateValue(fromValue, toValue) {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.animationStartTime = performance.now();
        this.animationStartValue = fromValue;
        this.animationTargetValue = toValue;

        const animate = (currentTime) => {
            const elapsed = currentTime - this.animationStartTime;
            const progress = Math.min(elapsed / this.options.animationDuration, 1);

            // 应用缓动函数
            const easedProgress = this.applyEasing(progress);
            const currentValue = this.animationStartValue +
                (this.animationTargetValue - this.animationStartValue) * easedProgress;

            this.setVisualValue(currentValue);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.currentValue = toValue;
                this.animationFrame = null;
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    applyEasing(t) {
        const easingFunctions = {
            'linear': t => t,
            'ease-in': t => t * t,
            'ease-out': t => t * (2 - t),
            'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            'ease-out-back': t => {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            }
        };

        const easingFn = easingFunctions[this.options.easing] || easingFunctions['ease-out'];
        return easingFn(t);
    }

    animateToDefaultValue() {
        this.animateValue(this.currentValue, this.options.defaultValue);
        this.updateValue(this.options.defaultValue, false);
    }

    addClickAnimation(percentage) {
        // 创建点击波纹效果
        const ripple = safeCreateElement('div', {
            className: 'click-ripple'
        });

        let positionStyle;
        if (this.options.orientation === 'horizontal') {
            positionStyle = {
                left: `${percentage}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)'
            };
        } else {
            positionStyle = {
                left: '50%',
                bottom: `${percentage}%`,
                transform: 'translate(-50%, 50%)'
            };
        }

        Object.assign(ripple.style, {
            position: 'absolute',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'var(--slider-color)',
            opacity: '0.6',
            pointerEvents: 'none',
            ...positionStyle
        });

        this.track.appendChild(ripple);

        // 动画
        ripple.animate([
            { transform: ripple.style.transform + ' scale(0)', opacity: 0.6 },
            { transform: ripple.style.transform + ' scale(2)', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        }).onfinish = () => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        };
    }

    updateStateIndicators(value) {
        // 更新颜色状态
        const percentage = this.getPercentage(value);
        let state = 'normal';

        if (percentage >= 80) {
            state = 'high';
        } else if (percentage >= 60) {
            state = 'medium';
        } else if (percentage >= 40) {
            state = 'low';
        }

        this.container.setAttribute('data-value-state', state);
    }

    getPercentage(value) {
        const range = this.options.max - this.options.min;
        return ((value - this.options.min) / range) * 100;
    }

    defaultFormatter(value) {
        return Number(value.toFixed(this.options.precision));
    }

    // 公共API方法
    getValue() {
        return this.currentValue;
    }

    setValue(value, animate = false) {
        this.updateValue(value, animate);
    }

    setMin(min) {
        if (min >= this.options.max) {
            throw new Error('最小值必须小于当前最大值');
        }

        this.options.min = min;
        this.options.value = Math.max(min, this.currentValue);
        this.applyStyles();
    }

    setMax(max) {
        if (max <= this.options.min) {
            throw new Error('最大值必须大于当前最小值');
        }

        this.options.max = max;
        this.options.value = Math.min(max, this.currentValue);
        this.applyStyles();
    }

    setStep(step) {
        if (step <= 0) {
            throw new Error('步长必须大于0');
        }

        this.options.step = step;
        this.updateValue(this.snapToStep(this.currentValue), false);
    }

    setDisabled(disabled) {
        this.options.disabled = disabled;
        this.container.classList.toggle('disabled', disabled);
        this.track.setAttribute('aria-disabled', disabled);
        this.track.setAttribute('tabindex', disabled ? -1 : 0);
    }

    setReadonly(readonly) {
        this.options.readonly = readonly;
        this.container.classList.toggle('readonly', readonly);
        this.track.setAttribute('aria-readonly', readonly);
    }

    addPoint(point) {
        if (point < this.options.min || point > this.options.max) {
            throw new Error('刻度点必须在最小值和最大值之间');
        }

        if (!this.options.points.includes(point)) {
            this.options.points.push(point);
            this.options.points.sort((a, b) => a - b);
            this.applyPointsStyles();
        }
    }

    removePoint(point) {
        const index = this.options.points.indexOf(point);
        if (index > -1) {
            this.options.points.splice(index, 1);
            this.applyPointsStyles();
        }
    }

    clearPoints() {
        this.options.points = [];
        this.applyPointsStyles();
    }

    setPoints(points) {
        this.options.points = points.filter(point =>
            point >= this.options.min && point <= this.options.max
        ).sort((a, b) => a - b);
        this.applyPointsStyles();
    }

    updateOptions(options) {
        Object.assign(this.options, options);
        this.validateOptions();
        this.applyStyles();
        this.updateValue(this.options.value, false);
    }

    reset() {
        this.setValue(this.options.defaultValue, true);
    }

    destroy() {
        // 清理动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        // 移除事件监听
        this.track.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        this.track.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        this.track.removeEventListener('keydown', this.handleKeyDown);
        this.track.removeEventListener('keyup', this.handleKeyUp);
        this.track.removeEventListener('focus', this.handleFocus);
        this.track.removeEventListener('blur', this.handleBlur);
        this.track.removeEventListener('mouseenter', this.handleMouseEnter);
        this.track.removeEventListener('mouseleave', this.handleMouseLeave);
        this.track.removeEventListener('click', this.handleTrackClick);
        this.track.removeEventListener('dblclick', this.handleDoubleClick);

        // 清理DOM
        this.element.innerHTML = '';

        // 移除事件监听器
        this.removeAllListeners();

        console.log('滑块组件已销毁');
    }
}

// 批量初始化函数
export function initSliders(container = document, selector = '[data-slider]') {
    const elements = container.querySelectorAll(selector);
    const sliders = [];

    elements.forEach(element => {
        try {
            const options = JSON.parse(element.getAttribute('data-slider-options') || '{}');
            const slider = new SliderComponent(element, options);
            sliders.push(slider);
        } catch (error) {
            console.error('初始化滑块失败:', error);
        }
    });

    return sliders;
}

// 默认导出
export default SliderComponent;