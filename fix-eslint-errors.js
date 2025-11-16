#!/usr/bin/env node
/**
 * ESLint错误修复脚本
 * 批量修复常见的ESLint错误
 */

const fs = require('fs');
const path = require('path');

// 目标文件列表
const files = [
  'ai-grading-extension/services/ai-scoring-engine.js',
  'ai-grading-extension/services/ai-service.js',
  'ai-grading-extension/services/index.js',
  'ai-grading-extension/services/ocr-service.js',
  'ai-grading-extension/services/workflow-manager.js',
  'ai-grading-extension/services/zhixue-adapter.js',
  'ai-grading-extension/popup/popup.js',
  'ai-grading-extension/popup/popup-secure.js',
  'ai-grading-extension/ui/index.js',
  'ai-grading-extension/utils/dom-safety.js',
  'ai-grading-extension/utils/dom-utils.js',
  'ai-grading-extension/utils/helpers.js',
  'ai-grading-extension/utils/security-utils.js',
  'ai-grading-extension/utils/security.js',
  'ai-grading-extension/utils/storage.js'
];

// 修复函数
function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let hasChanges = false;

  // 1. 修复全角冒号
  const newContent1 = content.replace(/：/g, ':');
  if (newContent1 !== content) {
    content = newContent1;
    hasChanges = true;
    console.log(`✅ Fixed full-width colon in ${filePath}`);
  }

  // 2. 修复中文逗号
  const newContent2 = content.replace(/，/g, ',');
  if (newContent2 !== content) {
    content = newContent2;
    hasChanges = true;
    console.log(`✅ Fixed full-width comma in ${filePath}`);
  }

  // 3. 修复中文句号
  const newContent3 = content.replace(/。/g, '.');
  if (newContent3 !== content) {
    content = newContent3;
    hasChanges = true;
    console.log(`✅ Fixed full-width period in ${filePath}`);
  }

  // 4. 修复无用的try/catch包装
  const newContent4 = content.replace(/try\s*{[\s\S]*?}\s*catch\s*\([^)]*\)\s*{\s*throw\s+error;\s*}/g, 'throw error;');
  if (newContent4 !== content) {
    content = newContent4;
    hasChanges = true;
    console.log(`✅ Fixed useless try-catch in ${filePath}`);
  }

  // 5. 移除未使用的变量标记
  const newContent5 = content.replace(/^\s*\/\/\s*no-unused-vars\s*$/gm, '');
  if (newContent5 !== content) {
    content = newContent5;
    hasChanges = true;
    console.log(`✅ Removed unused-vars comments in ${filePath}`);
  }

  if (hasChanges) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`💾 Saved changes to ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed in ${filePath}`);
  }
}

// 执行修复
console.log('🔧 Starting ESLint error fixes...\n');
files.forEach(file => fixFile(file));
console.log('\n✨ All fixes completed!');
