#!/bin/bash
# 发布脚本：自动处理版本更新、打包和Git标签

set -e  # 遇到错误即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否在git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "当前目录不是Git仓库"
    exit 1
fi

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    print_error "存在未提交的更改，请先提交所有更改"
    exit 1
fi

# 获取当前版本
CURRENT_VERSION=$(node scripts/version-manager.js show | grep "当前版本:" | cut -d: -f2 | tr -d ' ')
print_info "当前版本: $CURRENT_VERSION"

# 询问发布类型
echo ""
echo "请选择发布类型:"
echo "1) patch (补丁版本, $CURRENT_VERSION -> ${CURRENT_VERSION%.*}.$((${CURRENT_VERSION##*.} + 1)))"
echo "2) minor (次版本, ${CURRENT_VERSION%.*}.$(($(echo $CURRENT_VERSION | cut -d. -f2) + 1)).0)"
echo "3) major (主版本, $(($(echo $CURRENT_VERSION | cut -d. -f1) + 1)).0.0)"
echo "4) 自定义版本号"
echo "5) 取消"
echo ""

read -p "请输入选择 [1-5]: " choice

case $choice in
    1)
        BUMP_TYPE="patch"
        ;;
    2)
        BUMP_TYPE="minor"
        ;;
    3)
        BUMP_TYPE="major"
        ;;
    4)
        read -p "请输入新版本号 (x.y.z): " NEW_VERSION
        if ! node scripts/version-manager.js sync $NEW_VERSION > /dev/null 2>&1; then
            print_error "无效的版本号: $NEW_VERSION"
            exit 1
        fi
        NEW_VERSION=$(node scripts/version-manager.js show | grep "当前版本:" | cut -d: -f2 | tr -d ' ')
        ;;
    5)
        echo "取消发布"
        exit 0
        ;;
    *)
        print_error "无效选择"
        exit 1
        ;;
esac

# 如果选择了自动 bump
if [ -n "$BUMP_TYPE" ]; then
    print_info "执行版本自增: $BUMP_TYPE"
    node scripts/version-manager.js bump $BUMP_TYPE
    NEW_VERSION=$(node scripts/version-manager.js show | grep "当前版本:" | cut -d: -f2 | tr -d ' ')
fi

print_info "新版本: $NEW_VERSION"

# 确认发布
echo ""
read -p "确认发布版本 $NEW_VERSION? [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_info "取消发布"
    exit 0
fi

# 运行构建
print_info "运行构建..."
npm run build

if [ $? -ne 0 ]; then
    print_error "构建失败"
    exit 1
fi

print_info "构建成功"

# 提交版本更改
print_info "提交版本更改..."
git add package.json ai-grading-extension/manifest.json dist/
COMMIT_MSG="release: v$NEW_VERSION"
git commit -m "$COMMIT_MSG"

# 创建并推送标签
TAG_NAME="v$NEW_VERSION"
print_info "创建标签: $TAG_NAME"
git tag -a "$TAG_NAME" -m "Release version $NEW_VERSION"

# 询问是否推送
echo ""
read -p "是否推送到远程仓库? [y/N]: " push_confirm
if [[ $push_confirm =~ ^[Yy]$ ]]; then
    print_info "推送到远程仓库..."
    git push origin $(git branch --show-current)
    git push origin "$TAG_NAME"
    print_info "推送完成"
else
    print_warn "未推送到远程仓库"
    print_info "请手动运行: git push origin $(git branch --show-current) && git push origin $TAG_NAME"
fi

echo ""
print_info "🎉 发布完成!"
print_info "版本: $NEW_VERSION"
print_info "提交: $COMMIT_MSG"
print_info "标签: $TAG_NAME"

exit 0