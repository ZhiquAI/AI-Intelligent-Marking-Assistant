/**
 * Babel配置 - JavaScript编译器
 * @description 将现代JavaScript转换为兼容Chrome扩展的语法
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: '88', // Chrome 88+ 支持Manifest V3
          firefox: '78',
          safari: '14',
        },
        modules: false, // 保持ES6模块语法
        useBuiltIns: 'usage',
        corejs: 3,
        debug: false,
      },
    ],
  ],
  plugins: [
    // 类属性转换
    '@babel/plugin-proposal-class-properties',
    // 私有方法转换
    '@babel/plugin-proposal-private-methods',
    // 可选链操作符
    '@babel/plugin-proposal-optional-chaining',
    // 空值合并操作符
    '@babel/plugin-proposal-nullish-coalescing-operator',
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    },
  },
};