const path = require('path');
const EslintWebpackPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin'); // 新增

const getStyleLoader = (pre) => {
    return [
        'style-loader',
        'css-loader',
        {
            loader: 'postcss-loader',
            options: {
                postcssOptions: {
                    plugins: ['postcss-preset-env']
                }
            }
        },
        pre,
    ].filter(Boolean);
}

module.exports = {
    entry: './src/index.js',
    output: {
        path: undefined,
        filename: 'static/js/[name].js',
        chunkFilename: 'static/js/[name].chunk.js', // 你原来打错了 chunk
        assetModuleFilename: 'static/media/[hash:10][ext][query]',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: getStyleLoader(),
            },
            {
                test: /\.s[ac]ss$/,
                use: getStyleLoader('sass-loader'),
            },
            {
                test: /\.less$/,
                use: getStyleLoader('less-loader'),
            },
            {
                test: /\.styl$/,
                use: getStyleLoader('stylus-loader'),
            },
            {
                test: /\.(png|jpe?g|gif|svg|webp)$/, // 你原来写的 webg 是笔误
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 10 * 1024,
                    },
                }
            },
            {
                test: /\.(woff2?|ttf)$/,
                type: 'asset/resource',
            },
            {
                test: /\.jsx?$/,
                include: path.resolve(__dirname, '../src'),
                loader: 'babel-loader',
                options: {
                    // cacheDirectory: true,
                    // cacheCompression: false,
                    // ✅ 开发环境加上 react-refresh babel插件
                    plugins: [
                        'react-refresh/babel'
                    ].filter(Boolean)
                }
            },
        ]
    },
    plugins: [
        new EslintWebpackPlugin({
            context: path.resolve(__dirname, '../src'),
            exclude: 'node_modules',
            configType: 'eslintrc' // 之前解决 eslint 报错的配置，保留
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, '../public/index.html')
        }),
        // ✅ 新增 Fast Refresh 插件
        new ReactRefreshWebpackPlugin()
    ],
    mode: 'development',
    devtool: 'cheap-module-source-map',
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
        runtimeChunk: 'single',
        // runtimeChunk: {
        //     name: entrypoint => `runtime~~${entrypoint.name}`,
        // },
    },
    resolve: {
        extensions: ['.jsx', '.js', '.json'],
        alias: {
            '@': path.resolve(__dirname, '../src'),
        },
    },
    devServer: {
        host: 'localhost',
        port: 3010,
        open: true,
        hot: true, // 保留开启HMR
        historyApiFallback: true,
    }
}
