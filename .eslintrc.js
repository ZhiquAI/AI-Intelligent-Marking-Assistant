/**
 * ESLint配置 - AI智能阅卷助手
 * @description 代码质量和安全检查配置
 */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    webextensions: true,
    jest: true,
  },
  extends: [
    'standard', // JavaScript Standard风格
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: false,
      globalReturn: true,
    },
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly',
    lucide: 'readonly',
    Chart: 'readonly',
    jsPDF: 'readonly',
    pdfjsLib: 'readonly',
    Tesseract: 'readonly',
  },
  rules: {
    // 代码质量规则
    'no-console': 'warn', // 控制台日志警告
    'no-debugger': 'error', // 调试器错误
    'no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true
    }],
    'no-undef': 'error', // 未定义变量

    // 安全规则
    'no-eval': 'error', // 禁止使用eval
    'no-implied-eval': 'error', // 禁止使用隐式eval
    'no-new-func': 'error', // 禁止使用Function构造函数
    'no-script-url': 'error', // 禁止使用javascript: URL

    // 代码风格规则
    'indent': ['error', 4], // 4个空格缩进
    'quotes': ['error', 'single'], // 单引号
    'semi': ['error', 'always'], // 强制分号
    'comma-dangle': ['error', 'never'], // 禁止拖尾逗号
    'space-before-function-paren': ['error', 'never'], // 函数括号前无空格
    'keyword-spacing': 'error', // 关键字前后空格
    'space-infix-ops': 'error', // 操作符前后空格
    'eol-last': 'error', // 文件末尾空行
    'no-trailing-spaces': 'error', // 禁止行尾空格

    // 最佳实践规则
    'eqeqeq': ['error', 'always'], // 强制使用===和!==
    'no-var': 'error', // 禁止使用var
    'prefer-const': 'error', // 优先使用const
    'no-const-assign': 'error', // 禁止重新赋值const
    'arrow-spacing': 'error', // 箭头函数空格
    'prefer-arrow-callback': 'error', // 优先使用箭头函数
    'object-shorthand': 'error', // 对象简写
    'prefer-template': 'error', // 优先使用模板字符串

    // 安全相关 - 防止XSS
    'no-inner-declarations': 'error', // 禁止在块级作用域内声明函数
    'guard-for-in': 'error', // for-in循环需要hasOwnProperty检查
    'no-prototype-builtins': 'error', // 禁止使用原型链上的内建方法

    // 错误处理
    'no-throw-literal': 'error', // 禁止抛出字面量错误
    'prefer-promise-reject-errors': 'error', // Promise reject必须使用Error对象

    // 异步代码
    'no-async-promise-executor': 'error', // 禁止在Promise构造函数中使用async
    'no-await-in-loop': 'warn', // 循环中使用await警告
    'no-promise-executor-return': 'error', // Promise构造函数必须有返回值
  },
  overrides: [
    {
      // 测试文件规则
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // 配置文件规则
      files: ['webpack.config.js', '.eslintrc.js', 'jest.config.js'],
      rules: {
        'no-console': 'off',
        'semi': 'off',
      },
    },
  ],
};