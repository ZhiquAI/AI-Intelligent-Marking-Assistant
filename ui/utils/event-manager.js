/**
 * Event Manager - 全局事件总线
 * 提供安全的事件发布订阅机制，支持命名空间和错误处理
 */

class EventManager {
    constructor() {
        this.channels = new Map();
        this.middlewares = [];
        this.maxListeners = 50;
        this.debugMode = false;
    }

    /**
     * 订阅事件
     * @param {string} channel - 事件通道名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 选项
     * @returns {Function} 取消订阅函数
     */
    on(channel, handler, options = {}) {
        if (typeof channel !== 'string' || typeof handler !== 'function') {
            console.error('事件订阅参数无效:', { channel, handler });
            return () => false;
        }

        const { once = false, priority = 0 } = options;

        const listener = {
            handler,
            once,
            priority,
            id: Symbol('listener')
        };

        // 检查监听器数量限制
        const listeners = this.channels.get(channel) || [];
        if (listeners.length >= this.maxListeners) {
            console.warn(`事件通道 "${channel}" 监听器数量已达限制 (${this.maxListeners})`);
            return () => false;
        }

        listeners.push(listener);
        listeners.sort((a, b) => b.priority - a.priority); // 按优先级排序
        this.channels.set(channel, listeners);

        if (this.debugMode) {
            console.log(`订阅事件: ${channel}`, { listenerCount: listeners.length });
        }

        // 返回取消订阅函数
        return () => this.off(channel, listener.handler);
    }

    /**
     * 取消订阅事件
     * @param {string} channel - 事件通道名称
     * @param {Function} handler - 事件处理函数
     * @returns {boolean} 是否成功取消订阅
     */
    off(channel, handler) {
        const listeners = this.channels.get(channel);
        if (!listeners) return false;

        const index = listeners.findIndex(l => l.handler === handler);
        if (index === -1) return false;

        listeners.splice(index, 1);

        if (listeners.length === 0) {
            this.channels.delete(channel);
        }

        if (this.debugMode) {
            console.log(`取消订阅事件: ${channel}`, { remainingListeners: listeners.length });
        }

        return true;
    }

    /**
     * 发布事件
     * @param {string} channel - 事件通道名称
     * @param {*} payload - 事件载荷
     * @param {Object} options - 选项
     * @returns {boolean} 是否成功发布
     */
    emit(channel, payload, options = {}) {
        if (typeof channel !== 'string') {
            console.error('事件发布参数无效:', channel);
            return false;
        }

        const listeners = this.channels.get(channel);
        if (!listeners || listeners.length === 0) {
            if (this.debugMode) {
                console.log(`事件通道无监听器: ${channel}`);
            }
            return true; // 没有监听器也算成功
        }

        const event = {
            channel,
            payload,
            timestamp: Date.now(),
            prevented: false,
            stopped: false
        };

        // 执行中间件
        for (const middleware of this.middlewares) {
            try {
                const result = middleware(event);
                if (result === false) {
                    return false; // 中间件阻止事件
                }
            } catch (error) {
                console.error('事件中间件执行失败:', error);
            }
        }

        // 执行监听器
        const errors = [];
        const listenersToRemove = [];

        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];

            try {
                listener.handler.call(null, event);

                // 一次性监听器在执行后移除
                if (listener.once) {
                    listenersToRemove.push(i);
                }

                // 检查是否停止传播
                if (event.stopped) {
                    break;
                }
            } catch (error) {
                console.error(`事件监听器执行失败 (${channel}):`, error);
                errors.push({
                    error,
                    handler: listener.handler,
                    index: i
                });
            }
        }

        // 移除一次性监听器（从后往前删除，避免索引错乱）
        for (const index of listenersToRemove.reverse()) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.channels.delete(channel);
        }

        // 记录错误
        if (errors.length > 0) {
            console.error(`事件 "${channel}" 执行过程中发生 ${errors.length} 个错误:`, errors);
        }

        if (this.debugMode) {
            console.log(`发布事件: ${channel}`, {
                payload,
                listenerCount: listeners.length,
                errors: errors.length
            });
        }

        return errors.length === 0;
    }

    /**
     * 订阅一次事件
     * @param {string} channel - 事件通道名称
     * @param {Function} handler - 事件处理函数
     * @returns {Function} 取消订阅函数
     */
    once(channel, handler) {
        return this.on(channel, handler, { once: true });
    }

    /**
     * 异步等待事件
     * @param {string} channel - 事件通道名称
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise} 事件载荷
     */
    waitFor(channel, timeout = 5000) {
        return new Promise((resolve, reject) => {
            let timeoutId;

            const cleanup = this.on(channel, (event) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                cleanup(); // 取消订阅
                resolve(event.payload);
            });

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error(`等待事件 "${channel}" 超时`));
                }, timeout);
            }
        });
    }

    /**
     * 添加中间件
     * @param {Function} middleware - 中间件函数
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            console.error('中间件必须是函数:', middleware);
            return;
        }

        this.middlewares.push(middleware);
    }

    /**
     * 移除中间件
     * @param {Function} middleware - 要移除的中间件函数
     */
    removeMiddleware(middleware) {
        const index = this.middlewares.indexOf(middleware);
        if (index > -1) {
            this.middlewares.splice(index, 1);
        }
    }

    /**
     * 清除指定通道的所有监听器
     * @param {string} channel - 事件通道名称
     */
    clear(channel) {
        if (channel) {
            this.channels.delete(channel);
            if (this.debugMode) {
                console.log(`清除事件通道: ${channel}`);
            }
        } else {
            // 清除所有通道
            const channels = Array.from(this.channels.keys());
            this.channels.clear();
            if (this.debugMode) {
                console.log('清除所有事件通道:', channels);
            }
        }
    }

    /**
     * 获取通道信息
     * @param {string} channel - 事件通道名称（可选）
     * @returns {Object} 通道信息
     */
    getChannelInfo(channel = null) {
        if (channel) {
            const listeners = this.channels.get(channel) || [];
            return {
                channel,
                listenerCount: listeners.length,
                listeners: listeners.map(l => ({
                    once: l.once,
                    priority: l.priority
                }))
            };
        } else {
            // 返回所有通道信息
            const info = {};
            for (const [ch, listeners] of this.channels.entries()) {
                info[ch] = {
                    listenerCount: listeners.length,
                    listeners: listeners.map(l => ({
                        once: l.once,
                        priority: l.priority
                    }))
                };
            }
            return info;
        }
    }

    /**
     * 设置调试模式
     * @param {boolean} enabled - 是否启用调试模式
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
    }

    /**
     * 设置最大监听器数量
     * @param {number} max - 最大数量
     */
    setMaxListeners(max) {
        if (typeof max === 'number' && max > 0) {
            this.maxListeners = max;
        }
    }

    /**
     * 创建命名空间
     * @param {string} namespace - 命名空间
     * @returns {Object} 命名空间事件管理器
     */
    namespace(namespace) {
        if (typeof namespace !== 'string') {
            throw new Error('命名空间必须是字符串');
        }

        return {
            on: (channel, handler, options) => {
                return this.on(`${namespace}:${channel}`, handler, options);
            },
            off: (channel, handler) => {
                return this.off(`${namespace}:${channel}`, handler);
            },
            once: (channel, handler) => {
                return this.once(`${namespace}:${channel}`, handler);
            },
            emit: (channel, payload, options) => {
                return this.emit(`${namespace}:${channel}`, payload, options);
            },
            clear: () => {
                const channels = Array.from(this.channels.keys())
                    .filter(ch => ch.startsWith(`${namespace}:`));
                channels.forEach(ch => this.channels.delete(ch));
            }
        };
    }
}

// 创建全局事件管理器实例
const eventManager = new EventManager();

// 导出便捷函数
export const on = (channel, handler, options) => eventManager.on(channel, handler, options);
export const off = (channel, handler) => eventManager.off(channel, handler);
export const emit = (channel, payload, options) => eventManager.emit(channel, payload, options);
export const once = (channel, handler) => eventManager.once(channel, handler);
export const waitFor = (channel, timeout) => eventManager.waitFor(channel, timeout);
export const clear = (channel) => eventManager.clear(channel);
export const namespace = (ns) => eventManager.namespace(ns);

// 导出类和实例
export default eventManager;
export { EventManager };