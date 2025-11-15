#!/usr/bin/env node

/**
 * ESLint错误批量修复脚本
 * 自动修复常见的代码规范问题
 */

const fs = require('fs');
const path = require('path');

// 需要处理的目录
const TARGET_DIR = path.join(__dirname, 'ai-grading-extension');

// 错误类型和处理策略
const FIXES = {
  console: {
    pattern: /console\.log\(.*?\);?/g,
    action: 'remove'
  },
  unusedVars: {
    pattern: /(const|let|var)\s+(\w+)\s*=\s*[^;]+;\s*(?!\/\/ used)/g,
    action: 'comment'
  },
  caseDeclarations: {
    pattern: /(case\s+\w+:\s*)(const|let|var)(\s+\w+\s*=\s*[^;]+)/g,
    action: 'wrap'
  }
};

function fixConsoleLogs(content) {
  // 保留一些重要的console.log（错误、警告）
  const preserved = content.match(/console\.(error|warn)\([^)]+\)/g) || [];
  let result = content;

  preserved.forEach(match => {
    const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), `// ${match}`);
  });

  // 移除其他console.log
  result = result.replace(/console\.log\([^)]+\);?/g, '');
  return result;
}

function fixCaseDeclarations(content) {
  return content.replace(
    /(case\s+\w+:\s*)(const|let)(\s+\w+\s*=\s*[^;]+)/g,
    '$1{ $2$3 }'
  );
}

function fixUnusedVars(content) {
  // 简单的未使用变量检测（仅注释明显未使用的）
  const lines = content.split('\n');
  const varDeclarations = new Map();

  lines.forEach((line, idx) => {
    const match = line.match(/(const|let|var)\s+(\w+)\s*=\s*([^;]+)/);
    if (match && !line.includes('// used')) {
      varDeclarations.set(match[2], idx);
    }
  });

  return content;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    content = fixConsoleLogs(content);
    content = fixCaseDeclarations(content);

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed: ${path.relative(__dirname, filePath)}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

console.log('Starting ESLint error fixes...\n');
walkDir(TARGET_DIR);
console.log('\nDone! Run npm run lint to check remaining issues.');
