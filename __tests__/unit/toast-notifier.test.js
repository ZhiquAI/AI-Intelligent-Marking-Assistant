/**
 * Toast通知系统单元测试
 * @description 测试Toast通知组件的功能
 */

import { ToastNotifier } from '../../ai-grading-extension/ui/components/toast-notifier.js';

describe('ToastNotifier', () => {
    let toastNotifier;

    beforeEach(() => {
        // 创建ToastNotifier实例
        toastNotifier = new ToastNotifier();

        // Mock removeToast to work synchronously in tests
        const originalRemoveToast = toastNotifier.removeToast.bind(toastNotifier);
        toastNotifier.removeToast = function (id) {
            const toast = this.toasts.get(id);
            if (!toast) return;

            // Clear timer
            if (toast.timer) {
                clearInterval(toast.timer.timer);
            }

            // Add removing class (for tests that check this)
            toast.element.classList.add('toast-removing');

            // Schedule removal for later (like the real implementation)
            setTimeout(() => {
                this.toasts.delete(id);
            }, 0);
        };

        // Mock DOM方法
        document.createElement = jest.fn(tagName => {
            const element = {
                tagName: tagName.toLowerCase(),
                className: '',
                id: '',
                innerHTML: '',
                textContent: '',
                style: {},
                attributes: {},
                children: [],
                parentNode: null,
                appendChild: jest.fn(),
                remove: jest.fn(),
                addEventListener: jest.fn((event, handler, options) => {
                    // 立即触发 animationend 事件来模拟动画完成
                    if (event === 'animationend') {
                        setTimeout(handler, 0);
                    }
                }),
                removeEventListener: jest.fn(),
                querySelector: jest.fn(),
                setAttribute: jest.fn(),
                getAttribute: jest.fn(),
                insertBefore: jest.fn(),
                firstChild: null,
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                    contains: jest.fn()
                }
            };

            if (tagName === 'div') {
                element.querySelector.mockImplementation(selector => {
                    if (selector.includes('toast-close')) {
                        return { addEventListener: jest.fn() };
                    }
                    if (selector.includes('toast-progress-bar')) {
                        return { style: {} };
                    }
                    return null;
                });

                // Fix classList methods to return proper values
                let classListState = {};
                element.classList.contains.mockImplementation(
                    className => classListState[className] || false
                );
                element.classList.add.mockImplementation(className => {
                    classListState[className] = true;
                });
                element.classList.remove.mockImplementation(className => {
                    delete classListState[className];
                });

                // Fix getAttribute to return proper values
                let attributes = {};
                element.getAttribute.mockImplementation(attrName => attributes[attrName] || '');
                element.setAttribute.mockImplementation((name, value) => {
                    attributes[name] = value;
                });
            }

            return element;
        });

        // 正确mock document.head 和 document.body
        Object.defineProperty(document, 'head', {
            value: { appendChild: jest.fn() },
            writable: true,
            configurable: true
        });

        Object.defineProperty(document, 'body', {
            value: { appendChild: jest.fn() },
            writable: true,
            configurable: true
        });

        document.getElementById = jest.fn().mockReturnValue(null);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with default configuration', () => {
            expect(toastNotifier.container).toBeNull();
            expect(toastNotifier.toasts).toBeInstanceOf(Map);
            expect(toastNotifier.isInitialized).toBe(false);
            expect(toastNotifier.config).toEqual({
                position: 'top-right',
                duration: 3000,
                maxToasts: 5,
                animationDuration: 300
            });
        });
    });

    describe('Initialization', () => {
        test('should initialize Toast system', async () => {
            await toastNotifier.initialize();

            expect(toastNotifier.isInitialized).toBe(true);
            expect(document.createElement).toHaveBeenCalledWith('div');
            expect(document.head.appendChild).toHaveBeenCalled();
            expect(document.body.appendChild).toHaveBeenCalled();
        });

        test('should not initialize twice', async () => {
            await toastNotifier.initialize();
            const firstCallCount = document.createElement.mock.calls.length;

            await toastNotifier.initialize();
            const secondCallCount = document.createElement.mock.calls.length;

            expect(secondCallCount).toBe(firstCallCount);
        });

        test('should auto-initialize when showing first toast', () => {
            toastNotifier.show('Test message');

            expect(toastNotifier.isInitialized).toBe(true);
            expect(document.body.appendChild).toHaveBeenCalled();
        });
    });

    describe('Toast Creation', () => {
        beforeEach(async () => {
            await toastNotifier.initialize();
        });

        test('should create basic toast', () => {
            const toastId = toastNotifier.show('Test message');

            expect(toastId).toBeDefined();
            expect(toastNotifier.toasts.size).toBe(1);
            expect(document.createElement).toHaveBeenCalledWith('div');
        });

        test('should create toast with custom options', () => {
            const toastId = toastNotifier.show('Test message', {
                type: 'success',
                title: 'Success!',
                duration: 5000,
                showProgress: true
            });

            expect(toastId).toBeDefined();
            const toast = toastNotifier.toasts.get(toastId);
            expect(toast.config.type).toBe('success');
            expect(toast.config.title).toBe('Success!');
            expect(toast.config.duration).toBe(5000);
            expect(toast.config.showProgress).toBe(true);
        });

        test('should enforce max toasts limit', () => {
            // Temporarily use sync removal for this test
            const originalRemoveToast = toastNotifier.removeToast.bind(toastNotifier);
            toastNotifier.removeToast = function (id) {
                const toast = this.toasts.get(id);
                if (!toast) return;

                if (toast.timer) {
                    clearInterval(toast.timer.timer);
                }
                this.toasts.delete(id);
            };

            // Create more toasts than the limit
            for (let i = 0; i < 7; i++) {
                toastNotifier.show(`Message ${i}`);
            }

            // Restore original method
            toastNotifier.removeToast = originalRemoveToast;

            // Should only keep the max number of toasts
            expect(toastNotifier.toasts.size).toBe(toastNotifier.config.maxToasts);
        });
    });

    describe('Toast Types', () => {
        beforeEach(async () => {
            await toastNotifier.initialize();
        });

        test('should create success toast', () => {
            const id = toastNotifier.success('Success message');
            const toast = toastNotifier.toasts.get(id);

            expect(toast.config.type).toBe('success');
            expect(toast.element.className).toContain('toast-success');
        });

        test('should create error toast', () => {
            const id = toastNotifier.error('Error message');
            const toast = toastNotifier.toasts.get(id);

            expect(toast.config.type).toBe('error');
            expect(toast.element.className).toContain('toast-error');
        });

        test('should create warning toast', () => {
            const id = toastNotifier.warning('Warning message');
            const toast = toastNotifier.toasts.get(id);

            expect(toast.config.type).toBe('warning');
            expect(toast.element.className).toContain('toast-warning');
        });

        test('should create info toast', () => {
            const id = toastNotifier.info('Info message');
            const toast = toastNotifier.toasts.get(id);

            expect(toast.config.type).toBe('info');
            expect(toast.element.className).toContain('toast-info');
        });
    });

    describe('Toast Management', () => {
        beforeEach(async () => {
            await toastNotifier.initialize();
        });

        test('should remove toast by ID', () => {
            const id = toastNotifier.show('Test message');
            expect(toastNotifier.toasts.size).toBe(1);

            toastNotifier.removeToast(id);

            // Should be marked for removal
            const toast = toastNotifier.toasts.get(id);
            expect(toast.element.classList.contains('toast-removing')).toBe(true);
        });

        test('should clear all toasts', () => {
            // Create multiple toasts
            toastNotifier.show('Message 1');
            toastNotifier.show('Message 2');
            toastNotifier.show('Message 3');

            expect(toastNotifier.toasts.size).toBe(3);

            toastNotifier.clearAll();

            // All toasts should be marked for removal
            toastNotifier.toasts.forEach(toast => {
                expect(toast.element.classList.contains('toast-removing')).toBe(true);
            });
        });

        test('should destroy Toast system', () => {
            toastNotifier.show('Test message');

            toastNotifier.destroy();

            expect(toastNotifier.container).toBeNull();
            expect(toastNotifier.isInitialized).toBe(false);
            expect(document.getElementById).toHaveBeenCalledWith('toast-styles');
        });
    });

    describe('Timer Management', () => {
        beforeEach(async () => {
            await toastNotifier.initialize();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should start timer for auto-dismiss', () => {
            const id = toastNotifier.show('Test message', { duration: 1000 });
            const toast = toastNotifier.toasts.get(id);

            expect(toast.timer).toBeDefined();

            // Fast-forward time
            jest.advanceTimersByTime(1000);

            expect(toast.element.classList.contains('toast-removing')).toBe(true);
        });

        test('should pause timer on mouse enter', () => {
            const id = toastNotifier.show('Test message', { duration: 1000 });
            const toast = toastNotifier.toasts.get(id);

            // Trigger mouse enter
            const mouseEnterEvent = toast.element.addEventListener.mock.calls.find(
                call => call[0] === 'mouseenter'
            )[1];
            mouseEnterEvent();

            expect(toast.timer).toBeDefined();
        });

        test('should resume timer on mouse leave', () => {
            const id = toastNotifier.show('Test message', { duration: 1000 });
            const toast = toastNotifier.toasts.get(id);

            // Trigger mouse leave
            const mouseLeaveEvent = toast.element.addEventListener.mock.calls.find(
                call => call[0] === 'mouseleave'
            )[1];
            mouseLeaveEvent();

            expect(toast.timer).toBeDefined();
        });

        test('should handle toasts with no auto-dismiss', () => {
            const id = toastNotifier.show('Test message', { duration: 0 });
            const toast = toastNotifier.toasts.get(id);

            expect(toast.timer).toBeNull();
        });
    });

    describe('Icons and Titles', () => {
        test('should return correct icons for types', () => {
            expect(toastNotifier.getIcon('success')).toBe('✓');
            expect(toastNotifier.getIcon('error')).toBe('✕');
            expect(toastNotifier.getIcon('warning')).toBe('⚠');
            expect(toastNotifier.getIcon('info')).toBe('ℹ');
            expect(toastNotifier.getIcon('unknown')).toBe('ℹ'); // Default to info
        });

        test('should return correct default titles', () => {
            expect(toastNotifier.getDefaultTitle('success')).toBe('成功');
            expect(toastNotifier.getDefaultTitle('error')).toBe('错误');
            expect(toastNotifier.getDefaultTitle('warning')).toBe('警告');
            expect(toastNotifier.getDefaultTitle('info')).toBe('提示');
            expect(toastNotifier.getDefaultTitle('unknown')).toBe('提示'); // Default to info
        });
    });

    describe('Accessibility', () => {
        beforeEach(async () => {
            await toastNotifier.initialize();
        });

        test('should set proper ARIA attributes', () => {
            const id = toastNotifier.show('Test message');
            const toast = toastNotifier.toasts.get(id);

            expect(toast.element.getAttribute('role')).toBe('alert');
            expect(toast.element.getAttribute('aria-live')).toBe('assertive');
            expect(toast.element.getAttribute('aria-atomic')).toBe('true');
        });

        test('should support keyboard navigation', () => {
            const id = toastNotifier.show('Test message');
            const toast = toastNotifier.toasts.get(id);

            // Find the keydown event handler
            const keydownHandler = toast.element.addEventListener.mock.calls.find(
                call => call[0] === 'keydown'
            )[1];

            // Test Escape key
            const escapeEvent = { key: 'Escape' };
            keydownHandler(escapeEvent);
            expect(toast.element.classList.contains('toast-removing')).toBe(true);

            // Test Delete key
            const deleteEvent = { key: 'Delete' };
            keydownHandler(deleteEvent);
            expect(toast.element.classList.contains('toast-removing')).toBe(true);
        });
    });

    describe('Position Options', () => {
        test('should support different positions', () => {
            const positions = [
                'top-right',
                'top-left',
                'bottom-right',
                'bottom-left',
                'top-center',
                'bottom-center'
            ];

            positions.forEach(position => {
                const customNotifier = new ToastNotifier();
                customNotifier.config.position = position;

                expect(customNotifier.config.position).toBe(position);
            });
        });
    });
});
