## 问题概述
在 zsh 中看到 `zsh: command not found: <cmd>`，通常是命令未安装或 `PATH` 未包含该命令所在目录。

## 快速排查
1. 检查拼写：确认命令名称无误（大小写、空格）。
2. 查看当前 shell：`echo $SHELL` 应为 `/bin/zsh`。
3. 查看路径：`echo $PATH`，确认包含 `/opt/homebrew/bin`（Apple Silicon）或 `/usr/local/bin`（Intel）、以及 `/usr/bin:/bin`。
4. 查找命令位置：`which <cmd>` 或 `command -v <cmd>`；若无输出，说明未安装或不在 `PATH`。

## 解决步骤（macOS）
### A. 安装缺失命令
- 使用 Homebrew：`brew install <包名>`（例如 `brew install node`、`brew install python`）。
- 如果是 `npm/yarn/pip` 等，优先安装对应语言运行时（Node、Python）。

### B. 修复 PATH 配置
- Apple Silicon 常用：将以下加入 `~/.zprofile`（登录 shell）或 `~/.zshrc`（交互 shell）：
```
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
```
- Intel Mac 常用：
```
export PATH="/usr/local/bin:/usr/local/sbin:$PATH"
```
- 统一兼容（两架构都在前置）：
```
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
```
- 重新加载：`source ~/.zprofile` 或 `source ~/.zshrc`，或执行 `exec zsh`。

### C. 系统命令丢失
- 安装 Apple Command Line Tools：`xcode-select --install`，恢复基础开发工具及 `/usr/bin` 下常见命令。

## 常见场景建议
- `python` 未找到：在 macOS 上多为 `python3`，可添加别名：
```
alias python=python3
```
- `pip` 未找到：使用 `pip3` 或确保 Python 安装后在 `PATH`；必要时：`python3 -m pip install --upgrade pip`。
- `npm/yarn` 未找到：`brew install node`（附带 npm）；`brew install yarn`（或用 npm 安装 yarn）。
- `brew` 未找到：安装 Homebrew（https://brew.sh）并确保其 PATH 正确加入。

## 验证
- 重新打开终端或 `exec zsh`。
- 运行：`which <cmd>` 应返回绝对路径；`<cmd> --version` 正常输出。

## 后续优化
- 将 PATH 变更放在 `~/.zprofile`（登录）与 `~/.zshrc`（交互）中保持一致性。
- 使用版本管理工具（如 `mise` 或 `asdf`）统一管理多语言运行时并自动注入 PATH。

## 我将执行的步骤（待你确认）
1. 先读取你的 `~/.zprofile` 与 `~/.zshrc` 内容，确认 PATH 配置与架构匹配。
2. 检查你具体报错的命令是否已安装；若未安装，给出精确安装指令。
3. 修正 PATH 并验证 `which <cmd>` 与 `<cmd> --version`。
4. 总结变更并给出后续维护建议。