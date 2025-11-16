#!/usr/bin/env node
/**
 * 检查语法错误
 */

const { execSync } = require('child_process');
const fs = require('fs');

const filesToCheck = [
  'ai-grading-extension/services/ai-scoring-engine.js',
  'ai-grading-extension/popup/popup.js'
];

console.log('🔍 Checking syntax errors...\n');

filesToCheck.forEach(file => {
  const fullPath = process.cwd() + '/' + file;
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  console.log(`\n📄 Checking: ${file}`);

  // 检查文件编码和行结束符
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  console.log(`   Lines: ${totalLines}`);

  // 检查第156行
  if (file.includes('ai-scoring-engine')) {
    const line156 = lines[155]; // 0-indexed
    console.log(`   Line 156: "${line156.substring(0, 50)}..."`);

    // 检查第174行（结束符）
    const line174 = lines[173];
    console.log(`   Line 174: "${line174.trim()}"`);

    // 检查是否有未闭合的模板字符串
    const backticks = (content.match(/`/g) || []).length;
    console.log(`   Backticks count: ${backticks} (should be even)`);
  }

  // 尝试用node解析
  try {
    require('child_process').execSync(`node -c ${fullPath}`, { stdio: 'pipe' });
    console.log(`   ✅ Syntax OK`);
  } catch (e) {
    console.log(`   ❌ Syntax Error:`);
    console.log(`   ${e.stderr?.toString() || e.message}`);
  }
});
