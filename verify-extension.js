#!/usr/bin/env node

/**
 * Chrome扩展验证脚本
 * 验证扩展文件完整性和manifest.json格式
 */

const fs = require('fs');
const path = require('path');

const EXTENSION_DIR = path.join(__dirname, 'ai-grading-extension');
const REQUIRED_FILES = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup/popup.html',
    'popup/popup.js'
];

const REQUIRED_DIRS = [
    'core',
    'ui',
    'services',
    'utils',
    'popup'
];

console.log('🔍 验证Chrome扩展文件...\n');

// 检查必需文件
console.log('✅ 检查必需文件:');
let allFilesExist = true;
REQUIRED_FILES.forEach(file => {
    const filePath = path.join(EXTENSION_DIR, file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✓ ${file}`);
    } else {
        console.log(`  ✗ ${file} - 缺失!`);
        allFilesExist = false;
    }
});

// 检查必需目录
console.log('\n✅ 检查必需目录:');
REQUIRED_DIRS.forEach(dir => {
    const dirPath = path.join(EXTENSION_DIR, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        console.log(`  ✓ ${dir}/`);
    } else {
        console.log(`  ✗ ${dir}/ - 缺失!`);
    }
});

// 验证manifest.json
console.log('\n✅ 检查manifest.json:');
try {
    const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    console.log('  ✓ JSON格式正确');
    console.log(`  ✓ 版本: ${manifest.version}`);
    console.log(`  ✓ 名称: ${manifest.name}`);

    if (manifest.background && manifest.background.service_worker) {
        console.log(`  ✓ Service Worker: ${manifest.background.service_worker}`);
    }

    if (manifest.content_scripts && manifest.content_scripts.length > 0) {
        console.log(`  ✓ Content Scripts: ${manifest.content_scripts.length}个`);
    }

} catch (error) {
    console.log(`  ✗ 错误: ${error.message}`);
}

// 检查popup.html
console.log('\n✅ 检查popup.html:');
try {
    const popupPath = path.join(EXTENSION_DIR, 'popup/popup.html');
    const popupContent = fs.readFileSync(popupPath, 'utf8');

    if (popupContent.includes('<!DOCTYPE html>')) {
        console.log('  ✓ 有效的HTML5文档');
    }

    if (popupContent.includes('ai-grading-extension')) {
        console.log('  ✓ 包含扩展引用');
    }

} catch (error) {
    console.log(`  ✗ 错误: ${error.message}`);
}

// 总结
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
    console.log('✅ 扩展验证通过!');
    console.log('\n📦 加载扩展步骤:');
    console.log('1. 打开Chrome浏览器');
    console.log('2. 地址栏输入: chrome://extensions/');
    console.log('3. 开启"开发者模式"');
    console.log('4. 点击"加载已解压的扩展程序"');
    console.log(`5. 选择文件夹: ${EXTENSION_DIR}`);
    console.log('\n🎉 扩展已准备就绪!');
} else {
    console.log('❌ 扩展验证失败，请检查缺失的文件');
}
console.log('='.repeat(50));
