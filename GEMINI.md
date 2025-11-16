# GEMINI.md: AI Grading Extension

This document provides instructional context for interacting with the "AI Grading Extension" project.

## Project Overview

This is a Chrome browser extension designed to assist with grading on the `zhixue.com` online education platform. It injects a user interface into the grading pages, allowing users to leverage various Large Language Models (LLMs) for automated scoring of student answers.

The extension captures a student's answer as an image, sends it to an AI service for analysis, and then displays the suggested score and feedback. It also provides functionality to automatically fill the score into the webpage.

**Key Technologies:**

*   **Language:** JavaScript (ESM)
*   **Bundler:** Rollup.js
*   **Platform:** Chrome Extension (Manifest V3)
*   **Core Libraries:** `html2canvas` for screen capture.
*   **AI Services:** Integrates with OpenAI (GPT-4o), Google (Gemini), Alibaba (Qwen), and ZhipuAI (GLM).

**Architecture:**

The extension follows a standard Manifest V3 architecture:

*   **`background.js` (Service Worker):** Acts as the backend. It manages API keys, communicates with the external AI services, handles settings persistence (`chrome.storage`), and serves as the central message broker.
*   **`content-enhanced.js` (Content Script):** Acts as the frontend. It is injected into `zhixue.com` pages to render the UI, capture the answer area, and interact with the page's DOM (e.g., auto-filling scores).
*   **`/ui`:** Contains modular UI components that are dynamically loaded by the content script.
*   **`/utils`:** Contains shared helper functions for security, DOM manipulation, messaging, etc.
*   **`/services`:** Appears to hold service-related logic, likely for interacting with different AI providers.
*   **`/core`:** Contains core business logic for different aspects of the application.
*   **`dist/`:** The build output directory containing the final, loadable extension.

## Building and Running

**1. Install Dependencies:**

```bash
npm install
```

**2. Build the Extension:**

The project uses Rollup.js to bundle the files. The build command compiles the source code from the root directory into the `dist/` directory.

```bash
npm run build
```

**3. Load the Extension in Chrome:**

*   Open Chrome and navigate to `chrome://extensions`.
*   Enable "Developer mode" in the top-right corner.
*   Click "Load unpacked".
*   Select the `dist` directory from this project.
*   The extension, "智学网AI智能阅卷助手", should now be installed.

## Development Conventions

*   **Code Style:** The project uses ESLint (`.eslintrc.js`) and Prettier (`.prettierrc.js`) to enforce a consistent code style. It's recommended to use these tools to format code before committing.
*   **Modularity:** The codebase is organized into distinct modules by feature (e.g., `ui`, `utils`, `core`, `services`). New functionality should follow this pattern.
*   **Build Process:** All source files are in the root and subdirectories. The `rollup.config.mjs` file defines how these are bundled and copied into the `dist` folder for production.
*   **API Keys:** API keys for the AI services are **not** stored in the repository. They are managed through the extension's UI and stored securely in `chrome.storage.local`. The background script handles the encryption and decryption of these keys.
*   **Testing:** A `jest.config.js` file is present, suggesting that Jest is the framework for unit tests. However, no test scripts are defined in `package.json`.
