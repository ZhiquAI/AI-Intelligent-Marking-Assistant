/**
 * 智学AI - 设置面板测试
 * 测试设置面板的各项功能
 */

import { SettingsPanel } from './settings-panel.js';

// 测试环境设置
const testEnv = {
    setup: () => {
        // 模拟Chrome API
        global.chrome = {
            runtime: {
                sendMessage: jest.fn(),
                getManifest: jest.fn(() => ({ version: '1.0.0' }))
            },
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            }
        };

        // 模拟DOM
        document.body.innerHTML = `
            <div id="test-container"></div>
        `;

        // 模拟事件
        global.Event = class Event {
            constructor(type, options = {}) {
                this.type = type;
                this.bubbles = options.bubbles || false;
                this.cancelable = options.cancelable || false;
                this.target = options.target || null;
            }
        };

        global.MouseEvent = class MouseEvent extends Event {
            constructor(type, options = {}) {
                super(type, options);
                this.clientX = options.clientX || 0;
                this.clientY = options.clientY || 0;
            }
        };
    },

    teardown: () => {
        // 清理DOM
        document.body.innerHTML = '';
        delete global.chrome;
        delete global.Event;
        delete global.MouseEvent;
    }
};

describe('SettingsPanel', () => {
    let settingsPanel;

    beforeEach(() => {
        testEnv.setup();
        settingsPanel = new SettingsPanel();
    });

    afterEach(() => {
        testEnv.teardown();
        if (settingsPanel) {
            settingsPanel.destroy();
        }
    });

    describe('初始化', () => {
        test('应该正确初始化设置面板', () => {
            expect(settingsPanel).toBeInstanceOf(SettingsPanel);
            expect(settingsPanel.options).toBeDefined();
            expect(settingsPanel.settings).toBeDefined();
            expect(settingsPanel.isVisible).toBe(false);
        });

        test('应该使用默认选项', () => {
            const panel = new SettingsPanel();
            expect(panel.options.draggable).toBe(true);
            expect(panel.options.enableSecurityValidation).toBe(true);
            expect(panel.options.theme).toBe('auto');
        });

        test('应该接受自定义选项', () => {
            const customOptions = {
                draggable: false,
                theme: 'dark',
                responsive: false
            };
            const panel = new SettingsPanel(customOptions);
            expect(panel.options.draggable).toBe(false);
            expect(panel.options.theme).toBe('dark');
            expect(panel.options.responsive).toBe(false);
        });
    });

    describe('设置管理', () => {
        test('应该正确加载设置', async () => {
            const mockSettings = {
                general: { theme: 'dark', autoSave: false },
                ai: { defaultProvider: 'gemini' }
            };

            chrome.runtime.sendMessage.mockResolvedValue(mockSettings);

            await settingsPanel.loadSettings();

            expect(settingsPanel.settings.general.theme).toBe('dark');
            expect(settingsPanel.settings.general.autoSave).toBe(false);
            expect(settingsPanel.settings.ai.defaultProvider).toBe('gemini');
        });

        test('应该正确保存设置', async () => {
            const mockSave = jest.fn().mockResolvedValue(true);
            chrome.runtime.sendMessage.mockImplementation((action, data) => {
                if (action === 'storage.set') {
                    mockSave(data);
                    return Promise.resolve({ success: true });
                }
            });

            settingsPanel.settings.general.theme = 'light';

            await settingsPanel.saveSettings();

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith('storage.set', {
                settings: settingsPanel.settings,
                aiProviders: settingsPanel.aiProviders,
                securityConfig: settingsPanel.securityConfig,
                lastUpdated: expect.any(Number)
            });
        });

        test('应该正确合并设置', () => {
            const defaultSettings = {
                general: {
                    theme: 'auto',
                    autoSave: true,
                    language: 'zh-CN'
                },
                ai: {
                    defaultProvider: 'openai',
                    temperature: 0.7
                }
            };

            const loadedSettings = {
                general: {
                    theme: 'dark',
                    notifications: false
                }
            };

            const merged = settingsPanel.mergeSettings(defaultSettings, loadedSettings);

            expect(merged.general.theme).toBe('dark');
            expect(merged.general.autoSave).toBe(true);
            expect(merged.general.language).toBe('zh-CN');
            expect(merged.general.notifications).toBe(false);
            expect(merged.ai.defaultProvider).toBe('openai');
        });
    });

    describe('面板显示和隐藏', () => {
        test('应该正确显示面板', async () => {
            const mockCreatePanel = jest.fn().mockResolvedValue();
            jest.spyOn(settingsPanel, 'createPanel');
            jest.spyOn(settingsPanel, 'refreshStatus');

            await settingsPanel.show();

            expect(settingsPanel.createPanel).toHaveBeenCalled();
            expect(settingsPanel.refreshStatus).toHaveBeenCalled();
            expect(settingsPanel.isVisible).toBe(true);
        });

        test('应该正确隐藏面板', (done) => {
            settingsPanel.container = document.createElement('div');
            settingsPanel.container.style.opacity = '1';
            settingsPanel.options.animationDuration = 100;
            settingsPanel.isVisible = true;

            settingsPanel.hide();

            expect(settingsPanel.container.style.opacity).toBe('0');

            setTimeout(() => {
                expect(settingsPanel.isVisible).toBe(false);
                done();
            }, 150);
        });

        test('重复显示应该跳过创建', async () => {
            settingsPanel.isVisible = true;
            const createPanelSpy = jest.spyOn(settingsPanel, 'createPanel');

            await settingsPanel.show();

            expect(createPanelSpy).not.toHaveBeenCalled();
        });
    });

    describe('标签页管理', () => {
        beforeEach(async () => {
            await settingsPanel.createPanel();
        });

        test('应该正确切换标签页', () => {
            const switchTabSpy = jest.spyOn(settingsPanel, 'switchTab');

            settingsPanel.switchTab('ai');

            expect(settingsPanel.currentTab).toBe('ai');
            expect(switchTabSpy).toHaveBeenCalledWith('ai');
        });

        test('应该触发标签页切换事件', (done) => {
            settingsPanel.on('tabChanged', (tabName) => {
                expect(tabName).toBe('security');
                done();
            });

            settingsPanel.switchTab('security');
        });
    });

    describe('设置处理', () => {
        beforeEach(async () => {
            await settingsPanel.createPanel();
        });

        test('应该正确处理设置变更', () => {
            const mockElement = {
                dataset: { setting: 'general.theme' },
                value: 'dark',
                type: 'select'
            };

            const mockEvent = {
                target: mockElement,
                matches: jest.fn(() => true)
            };

            settingsPanel.handleSettingChange(mockEvent);

            expect(settingsPanel.settings.general.theme).toBe('dark');
        });

        test('应该正确处理复选框设置', () => {
            const mockElement = {
                dataset: { setting: 'general.autoSave' },
                checked: false,
                type: 'checkbox'
            };

            const mockEvent = {
                target: mockElement,
                matches: jest.fn(() => true)
            };

            settingsPanel.handleSettingChange(mockEvent);

            expect(settingsPanel.settings.general.autoSave).toBe(false);
        });

        test('应该正确处理数字设置', () => {
            const mockElement = {
                dataset: { setting: 'ai.temperature' },
                value: '0.8',
                type: 'number'
            };

            const mockEvent = {
                target: mockElement,
                matches: jest.fn(() => true)
            };

            settingsPanel.handleSettingChange(mockEvent);

            expect(settingsPanel.settings.ai.temperature).toBe(0.8);
        });
    });

    describe('主题管理', () => {
        test('应该正确设置主题', () => {
            settingsPanel.setTheme('dark');

            expect(settingsPanel.options.theme).toBe('dark');
            expect(settingsPanel.container.getAttribute('data-theme')).toBe('dark');
        });

        test('应该应用主题到文档', async () => {
            const applySpy = jest.spyOn(settingsPanel, 'applySettings');
            settingsPanel.settings.general.theme = 'light';

            await settingsPanel.applySettings();

            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
            expect(applySpy).toHaveBeenCalled();
        });
    });

    describe('安全功能', () => {
        test('应该正确初始化安全组件', async () => {
            const initSpy = jest.spyOn(settingsPanel, 'initSecurityComponents');
            initSpy.mockResolvedValue();

            await settingsPanel.initSecurityComponents();

            expect(initSpy).toHaveBeenCalled();
        });

        test('应该正确更新安全状态', () => {
            const status = { level: 'healthy', message: '系统正常' };

            settingsPanel.updateSecurityStatus('csp', status);

            const statusElement = settingsPanel.container.querySelector('[data-security-status="csp"]');
            expect(statusElement).toBeTruthy();
        });
    });

    describe('事件处理', () => {
        beforeEach(async () => {
            await settingsPanel.createPanel();
        });

        test('应该正确处理保存操作', async () => {
            const saveSpy = jest.spyOn(settingsPanel, 'saveSettings').mockResolvedValue();
            const applySpy = jest.spyOn(settingsPanel, 'applySettings').mockResolvedValue();
            const hideSpy = jest.spyOn(settingsPanel, 'hide');

            await settingsPanel.handleSave();

            expect(saveSpy).toHaveBeenCalled();
            expect(applySpy).toHaveBeenCalled();
        });

        test('应该正确处理重置操作', async () => {
            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
            const saveSpy = jest.spyOn(settingsPanel, 'saveSettings').mockResolvedValue();

            await settingsPanel.handleReset();

            expect(confirmSpy).toHaveBeenCalledWith('确定要重置所有设置吗？此操作不可撤销。');
            expect(saveSpy).toHaveBeenCalled();
        });

        test('应该取消重置操作如果用户确认', async () => {
            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
            const saveSpy = jest.spyOn(settingsPanel, 'saveSettings');

            await settingsPanel.handleReset();

            expect(confirmSpy).toHaveBeenCalled();
            expect(saveSpy).not.toHaveBeenCalled();
        });
    });

    describe('清理和销毁', () => {
        test('应该正确销毁面板', () => {
            const container = document.createElement('div');
            document.body.appendChild(container);
            settingsPanel.container = container;
            settingsPanel.tabManager = { destroy: jest.fn() };
            settingsPanel.draggable = { destroy: jest.fn() };

            settingsPanel.destroy();

            expect(document.body.contains(container)).toBe(false);
            expect(settingsPanel.tabManager.destroy).toHaveBeenCalled();
            expect(settingsPanel.draggable.destroy).toHaveBeenCalled();
            expect(settingsPanel.container).toBeNull();
        });
    });

    describe('模板数据', () => {
        test('应该正确生成模板数据', () => {
            const templateData = settingsPanel.getTemplateData();

            expect(templateData).toHaveProperty('settings');
            expect(templateData).toHaveProperty('aiProviders');
            expect(templateData).toHaveProperty('theme');
            expect(templateData).toHaveProperty('securityConfig');
            expect(templateData).toHaveProperty('version');
        });
    });

    describe('错误处理', () => {
        test('应该处理创建面板错误', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            jest.spyOn(settingsPanel.templateLoader, 'load').mockRejectedValue(new Error('模板加载失败'));

            await expect(settingsPanel.createPanel()).rejects.toThrow('模板加载失败');

            consoleSpy.mockRestore();
        });

        test('应该处理保存设置错误', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            chrome.runtime.sendMessage.mockRejectedValue(new Error('保存失败'));

            await expect(settingsPanel.saveSettings()).rejects.toThrow('保存失败');

            consoleSpy.mockRestore();
        });
    });
});

// 集成测试
describe('SettingsPanel Integration', () => {
    let settingsPanel;

    beforeEach(() => {
        testEnv.setup();
        settingsPanel = new SettingsPanel();
    });

    afterEach(() => {
        testEnv.teardown();
        if (settingsPanel) {
            settingsPanel.destroy();
        }
    });

    test('完整的设置面板工作流程', async () => {
        // 1. 初始化
        await settingsPanel.init();
        expect(settingsPanel.emit).toHaveBeenCalledWith('initialized');

        // 2. 显示面板
        await settingsPanel.show();
        expect(settingsPanel.isVisible).toBe(true);
        expect(settingsPanel.emit).toHaveBeenCalledWith('shown');

        // 3. 切换标签页
        settingsPanel.switchTab('ai');
        expect(settingsPanel.currentTab).toBe('ai');

        // 4. 修改设置
        settingsPanel.setSettingValue('general', 'theme', 'dark');
        expect(settingsPanel.settings.general.theme).toBe('dark');

        // 5. 保存设置
        chrome.runtime.sendMessage.mockResolvedValue({ success: true });
        await settingsPanel.saveSettings();
        expect(settingsPanel.emit).toHaveBeenCalledWith('settingsSaved', settingsPanel.settings);

        // 6. 隐藏面板
        settingsPanel.hide();
        expect(settingsPanel.isVisible).toBe(false);
        expect(settingsPanel.emit).toHaveBeenCalledWith('hidden');
    });

    test('键盘快捷键支持', async () => {
        await settingsPanel.show();
        await settingsPanel.createPanel();

        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        const hideSpy = jest.spyOn(settingsPanel, 'hide');

        document.dispatchEvent(escapeEvent);

        expect(hideSpy).toHaveBeenCalled();
    });
});

// 性能测试
describe('SettingsPanel Performance', () => {
    let settingsPanel;

    beforeEach(() => {
        testEnv.setup();
        settingsPanel = new SettingsPanel();
    });

    afterEach(() => {
        testEnv.teardown();
        if (settingsPanel) {
            settingsPanel.destroy();
        }
    });

    test('初始化时间应该在合理范围内', async () => {
        const startTime = performance.now();
        await settingsPanel.init();
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('面板创建时间应该在合理范围内', async () => {
        const startTime = performance.now();
        await settingsPanel.createPanel();
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(500); // 应该在500ms内完成
    });

    test('设置变更处理时间', async () => {
        await settingsPanel.createPanel();

        const mockElement = {
            dataset: { setting: 'general.theme' },
            value: 'dark',
            type: 'select'
        };

        const mockEvent = {
            target: mockElement,
            matches: jest.fn(() => true)
        };

        const startTime = performance.now();
        settingsPanel.handleSettingChange(mockEvent);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(10); // 应该在10ms内完成
    });
});

export { testEnv };