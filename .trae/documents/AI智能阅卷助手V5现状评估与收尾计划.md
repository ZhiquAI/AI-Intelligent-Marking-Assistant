## 总览
- 项目为 Chrome 扩展（MV3），源码集中在 `ai-grading-extension/*`，含 `background.js`、`content.js`、`popup/*`、`core/*`、`services/*`、`ui/*`、`utils/*`，入口与权限在 `ai-grading-extension/manifest.json:8-34`。
- 构建使用 Webpack 5，输出 `dist`，多入口（`background/content/popup/core/ui/utils`），参考 `webpack.config.js:18-49`，复制资源到 `assets/ui/styles/popup`，参考 `webpack.config.js:125-156`。
- 评分工作流端到端已具备：OCR→Rubric→AI评分（单/双模型）→规则应用→渲染→分数同步→人工复核；核心实现位于 `core/grading/*`、`services/*`、`ui/components/*`。

## 关键完成度
- 核心评分流程
  - 评分引擎与工作流：`grading-processor.js:119-157,238-284`、`ai-grader.js:55-104,169-225,230-339,391-432`、`ai-service.js:229-351,356-557,580-619`。
  - 视觉评分（答题卡）：`ai-scoring-engine.js:274-466,527-599,622-664`。
  - 分数同步与复核：`score-sync-engine.js:93-167,211-246`、`review-manager.js:183-221,354-433`、`review-records.js:17-219`。
- UI 展示与交互
  - 评分展示与反馈：`ui/components/ai-score-display.js:574-668,670-732,769-789`。
  - 进度与统计：`core/grading/progress-tracker.js:90-131`。
  - 弹窗与页面脚本：`popup/popup.html`、`popup.js`、`content.js`（多处模板插入与交互）。
- 构建脚本与输出
  - 多入口与产物拆分，`splitChunks/runtimeChunk` 已启用，参考 `webpack.config.js:161-197`；`devServer` 指向 `dist`，参考 `webpack.config.js:199-214`。

## 主要缺口与风险
- 资源缺失
  - `assets/icons/*` 与 `libs/*` 未找到，但被 `manifest.json` 与 Copy 规则引用（`manifest.json:11-16,64-69`；`webpack.config.js:130-143`；`manifest.json:52-58`）。
- 安全加固不足
  - `content_security_policy` 未在 `manifest.json` 配置；内联事件与裸 `innerHTML` 广泛存在（示例：`content.js:165-173,358-380,730-738,786-828`；`popup.js:383,927,1608,1637...`；`ai-score-display.js:714,731,749`）。
  - `utils/messaging.js` 为空；消息接收未做来源与 schema 校验（`content.js:271-276,405-426`）。
  - 存储加密口令硬编码 `'storage_key'`（`utils/storage.js:39-50,76-97`）。
  - 引入 `dompurify/jsencrypt` 但未使用；安全工具未强制应用到渲染路径。
- 测试与依赖不匹配
  - `jest-environment-jsdom@30` 与 `jest@29` 主版本不齐（`package.json:44`）；`babel-jest` 未声明（`jest.config.js:55-57`）。
  - `moduleNameMapper` 指向不存在的 `tests/__mocks__`（`jest.config.js:20-21`）；`testMatch` 包含无效的 `tests` 路径（`jest.config.js:11`）。
  - 集成测试存在重复块（`__tests__/integration/grading-workflow.test.js:482-末`）；若不修复将造成冗余执行。
- 工程一致性
  - `WebpackExtensionManifestPlugin` 已 `require` 未使用（`webpack.config.js:8`）。
  - 根层 `core/ui/utils` 与扩展内重复，根目录文件多为索引/占位，需明确用途，否则造成维护混乱。

## 收尾实施计划
### 阶段1：构建与依赖对齐
- 统一 Jest 版本：保留 `jest@^29.6.0`，移除 `jest-environment-jsdom@30`，直接使用 `testEnvironment: 'jsdom'`；或整体升级到 `^30.x` 并验证兼容。
- 添加 `babel-jest@^29.6.0`，确保转译链与 `.babelrc.js` 的 `env.test` 配置匹配（`babel-preset-env` 已有）。
- 修正 `jest.config.js`：
  - `testMatch` → `['**/__tests__/**/*.(test|spec).js']`。
  - `moduleNameMapper` 指向 `__tests__/__mocks__/styleMock.js` 与 `fileMock.js`；或样式使用 `identity-obj-proxy`。
- 清理重复测试块：删除 `grading-workflow.test.js:482-末` 的重复段。

### 阶段2：安全与合规加固
- 在 `manifest.json` 添加严格 CSP（MV3 `extension_pages`）：`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'`。
- 替换内联事件与裸 `innerHTML`：统一使用安全模板或 `DomSafety.safeInnerHTML`；变量部分用 `textContent` 构造。
- 实现 `utils/messaging.js`：来源校验（`sender.id`）、动作白名单、数据 schema 校验与长度限制。
- 修正存储加密：将 `'storage_key'` 改为动态密钥来源（`SecurityManager.encryptionKey`），统一敏感数据走加密路径；禁止直接 `localStorage.setItem`。
- 审核依赖：如不需 RSA，移除 `jsencrypt`；如需，提供安全封装与密钥管理。

### 阶段3：资源与构建产物完善
- 补齐 `assets/icons/*` 与必要静态资源；核对 `web_accessible_resources` 与 Copy 规则一致性。
- 评估 `WebpackExtensionManifestPlugin` 是否需要启用；若启用，配置与 `manifest.json` 同步生成。
- 明确根层 `core/ui/utils` 的用途（示例页面或打包来源），避免与扩展源码混淆。

### 阶段4：测试覆盖拓展与稳定
- 为 `services/*` 与 `core/grading/*` 增加最小行为测试：成功路径与主要错误分支（重试/双模型一致性/分数修正）。
- 为关键 UI 组件（`ai-score-display`、`main-layout` 等）添加渲染/交互测试（JSDOM，下沉样式 mock）。
- 统一使用全局 `setup.js` 的 mock；组件特定 mock 在用例 `beforeEach/afterEach` 管理，避免相互影响。

### 阶段5：打包与发布准备
- 完成 `dist` 构建检查（入口产物、资源复制、分包策略）。
- 在 `host_permissions` 中移除非必要站点与外部资源；尽量改为本地打包或使用 SRI。
- 生成扩展包并进行本地浏览器验证（安装、权限、UI与工作流、性能）。

### 交付物
- 修复后的 `manifest.json`（含 CSP）与对齐的 `jest.config.js`。
- 完整可构建的 `dist` 与缺失资源补齐。
- 最小测试集（服务与核心+关键组件），稳定通过。
- 安全改造提交：消息封装、存储密钥修复、危险渲染点替换。

如确认以上计划，我将开始按阶段推进，并在每个阶段结束提供可验证的构建与测试结果。