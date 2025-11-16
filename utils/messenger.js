/**
 * 背景通信工具
 * 提供统一的 sendMessage Promise 封装，避免在各模块重复定义
 */
export function sendBackgroundMessage(action, data = {}) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({ action, data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!response || response.success === false) {
                    reject(new Error(response?.error || '未知错误'));
                    return;
                }
                resolve(response.data);
            });
        } catch (error) {
            reject(error);
        }
    });
}
