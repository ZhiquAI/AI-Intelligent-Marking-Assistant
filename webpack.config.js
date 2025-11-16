/**
 * Webpack配置 - Chrome扩展构建
 * @description 为AI智能阅卷助手Chrome扩展提供现代化的构建流程
 */

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackExtensionManifestPlugin = require('webpack-extension-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    console.log(`🔧 Webpack构建模式: ${isProduction ? '生产环境' : '开发环境'}`);

    return {
        // 入口文件配置
        entry: {
            // Chrome扩展主要入口
            background: './ai-grading-extension/background.js',
            content: './ai-grading-extension/content.js',
            popup: './ai-grading-extension/popup/popup.js',

            // 核心模块
            'core/grading/index': './ai-grading-extension/core/grading/index.js',
            'core/review/index': './ai-grading-extension/core/review/index.js',
            'core/analysis/index': './ai-grading-extension/core/analysis/index.js',
            'core/file/index': './ai-grading-extension/core/file/index.js',

            // UI组件
            'ui/index': './ai-grading-extension/ui/index.js',

            // 工具函数
            'utils/security': './ai-grading-extension/utils/security.js',
            'utils/storage': './ai-grading-extension/utils/storage.js',
            'utils/dom-safety': './ai-grading-extension/utils/dom-safety.js'
        },

        // 输出配置
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: true, // 清理旧的构建文件
            environment: {
                // 支持Chrome扩展的ES6模块语法
                module: true,
                dynamicImport: true
            }
        },

        // 模块解析配置
        resolve: {
            extensions: ['.js', '.json'],
            alias: {
                '@': path.resolve(__dirname, 'ai-grading-extension'),
                '@core': path.resolve(__dirname, 'ai-grading-extension/core'),
                '@ui': path.resolve(__dirname, 'ai-grading-extension/ui'),
                '@utils': path.resolve(__dirname, 'ai-grading-extension/utils'),
                '@popup': path.resolve(__dirname, 'ai-grading-extension/popup')
            }
        },

        // 模块处理规则
        module: {
            rules: [
                // JavaScript处理
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        targets: {
                                            chrome: '88' // Chrome 88+ 支持Manifest V3
                                        },
                                        modules: false, // 保持ES6模块语法
                                        useBuiltIns: 'usage',
                                        corejs: 3
                                    }
                                ]
                            ]
                        }
                    }
                },

                // CSS处理
                {
                    test: /\.css$/,
                    use: [
                        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                sourceMap: !isProduction
                            }
                        }
                    ]
                },

                // 资源文件处理
                {
                    test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/images/[name].[hash][ext]'
                    }
                },

                // 字体文件处理
                {
                    test: /\.(woff|woff2|ttf|eot)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'assets/fonts/[name].[hash][ext]'
                    }
                }
            ]
        },

        // 插件配置
        plugins: [
            // 复制静态资源
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: 'ai-grading-extension/assets',
                        to: 'assets',
                        noErrorOnMissing: true
                    },
                    {
                        from: 'ai-grading-extension/popup/popup.html',
                        to: 'popup/popup.html'
                    },
                    {
                        from: 'ai-grading-extension/ui/styles',
                        to: 'ui/styles',
                        noErrorOnMissing: true
                    }
                ]
            }),

            // 处理CSS文件
            ...(isProduction
                ? [
                      new MiniCssExtractPlugin({
                          filename: '[name].css',
                          chunkFilename: '[id].css'
                      })
                  ]
                : [])
        ],

        // 开发工具配置
        devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',

        // 优化配置
        optimization: {
            // 代码分割
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    // 第三方库分离
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                        priority: 10
                    },
                    // 公共模块分离
                    common: {
                        minChunks: 2,
                        chunks: 'all',
                        name: 'common',
                        priority: 5,
                        reuseExistingChunk: true
                    }
                }
            },

            // 运行时代码分离
            runtimeChunk: {
                name: 'runtime'
            },

            // 生产环境优化
            ...(isProduction
                ? {
                      minimize: true,
                      sideEffects: false
                  }
                : {})
        },

        // 开发服务器配置
        devServer: {
            port: 3000,
            hot: true,
            open: false,
            compress: true,
            static: {
                directory: path.join(__dirname, 'dist')
            },
            client: {
                overlay: {
                    errors: true,
                    warnings: false
                }
            }
        },

        // 性能提示
        performance: {
            hints: isProduction ? 'warning' : false,
            maxEntrypointSize: 512000, // 500KB
            maxAssetSize: 512000
        },

        // 统计信息
        stats: {
            colors: true,
            modules: false,
            children: false,
            chunks: false,
            chunkModules: false
        }
    };
};
