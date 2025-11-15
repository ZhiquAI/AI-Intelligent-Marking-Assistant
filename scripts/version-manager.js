#!/usr/bin/env node
/**
 * 版本管理器
 * 自动同步package.json和manifest.json中的版本号
 */

const fs = require('fs');
const path = require('path');

// 文件路径
const PACKAGE_PATH = path.join(__dirname, '..', 'package.json');
const MANIFEST_PATH = path.join(__dirname, '..', 'ai-grading-extension', 'manifest.json');

/**
 * 读取JSON文件
 */
function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 无法读取文件: ${filePath}`, error.message);
    process.exit(1);
  }
}

/**
 * 写入JSON文件
 */
function writeJson(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.error(`❌ 无法写入文件: ${filePath}`, error.message);
    process.exit(1);
  }
}

/**
 * 获取当前版本
 */
function getCurrentVersion() {
  const packageJson = readJson(PACKAGE_PATH);
  return packageJson.version;
}

/**
 * 验证版本格式
 */
function isValidVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+(-[A-Za-z0-9.-]+)?$/;
  return versionRegex.test(version);
}

/**
 * 同步版本号
 */
function syncVersion(version = null) {
  if (!version) {
    version = getCurrentVersion();
  }

  if (!isValidVersion(version)) {
    console.error(`❌ 无效的版本号: ${version}`);
    console.log('版本号格式应为: x.y.z 或 x.y.z-beta.1');
    process.exit(1);
  }

  console.log(`🔄 正在同步版本号: ${version}`);

  // 更新 package.json
  const packageJson = readJson(PACKAGE_PATH);
  packageJson.version = version;
  writeJson(PACKAGE_PATH, packageJson);
  console.log(`✅ 已更新 package.json -> ${version}`);

  // 更新 manifest.json
  const manifestJson = readJson(MANIFEST_PATH);
  manifestJson.version = version;
  writeJson(MANIFEST_PATH, manifestJson);
  console.log(`✅ 已更新 manifest.json -> ${version}`);

  console.log('\n🎉 版本同步完成！');
}

/**
 * 版本号自增
 */
function bumpVersion(type) {
  const packageJson = readJson(PACKAGE_PATH);
  const currentVersion = packageJson.version;
  const parts = currentVersion.split('-')[0].split('.'); // 移除预发布标签
  const [major, minor, patch] = parts.map(Number);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      console.error(`❌ 未知版本类型: ${type}`);
      console.log('支持类型: major, minor, patch');
      process.exit(1);
  }

  console.log(`🔄 ${currentVersion} -> ${newVersion}`);
  syncVersion(newVersion);

  return newVersion;
}

/**
 * 显示当前版本
 */
function showVersion() {
  const version = getCurrentVersion();
  console.log(`当前版本: ${version}`);
  return version;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'show':
      case 'current':
        showVersion();
        break;

      case 'sync':
        const version = args[1];
        if (!version) {
          console.error('❌ 请指定版本号');
          console.log('用法: npm run version:sync [x.y.z]');
          process.exit(1);
        }
        syncVersion(version);
        break;

      case 'bump':
        const type = args[1] || 'patch';
        bumpVersion(type);
        break;

      case 'check':
        const pkgVer = readJson(PACKAGE_PATH).version;
        const manVer = readJson(MANIFEST_PATH).version;
        const isSynced = pkgVer === manVer;

        console.log(`package.json: ${pkgVer}`);
        console.log(`manifest.json: ${manVer}`);
        console.log(isSynced ? '✅ 版本已同步' : '❌ 版本不同步');
        process.exit(isSynced ? 0 : 1);

      default:
        console.log(`
版本管理器使用说明:

  查看当前版本:
    npm run version:show

  同步版本号:
    npm run version:sync [x.y.z]

  版本自增:
    npm run version:bump:patch   # x.y.z -> x.y.(z+1)
    npm run version:bump:minor   # x.y.z -> x.(y+1).0
    npm run version:bump:major   # x.y.z -> (x+1).0.0

  检查版本同步:
    npm run version:check

示例:
  npm run version:sync 5.0.1
  npm run version:bump:minor
`);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();