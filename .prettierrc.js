/**
 * Prettier配置 - 代码格式化
 * @description 统一的代码格式化规则
 */

module.exports = {
  // 基本格式设置
  printWidth: 100, // 每行最大长度
  tabWidth: 4, // 制表符宽度
  useTabs: false, // 使用空格代替制表符
  semi: true, // 使用分号
  singleQuote: true, // 使用单引号
  quoteProps: 'as-needed', // 只在需要时给对象属性加引号
  jsxSingleQuote: false, // JSX中使用双引号
  trailingComma: 'none', // 禁止拖尾逗号
  bracketSpacing: true, // 对象括号内空格
  bracketSameLine: false, // 多行JSX元素括号换行
  arrowParens: 'avoid', // 箭头函数参数不加括号
  endOfLine: 'lf', // 行尾符

  // HTML格式化
  htmlWhitespaceSensitivity: 'css', // HTML空白符处理
  vueIndentScriptAndStyle: false, // Vue文件缩进

  // 注释格式化
  proseWrap: 'preserve', // 注释换行保持原样

  // 特殊文件处理
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 120,
        proseWrap: 'always',
      },
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
  ],

  // 插件配置
  plugins: [],
};