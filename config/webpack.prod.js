const path = require('path');
const EslintWebpackPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { WebpackAssetsManifest } = require('webpack-assets-manifest');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin'); // TS 类型检查

// 生产环境：把 style-loader 替换成 MiniCssExtractPlugin.loader
const getStyleLoader = (pre) => {
  return [
    MiniCssExtractPlugin.loader,
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
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, '../dist'), // 生产必须指定输出目录
    filename: 'js/[name].[contenthash:10].js',
    chunkFilename: 'js/[name].[contenthash:10].chunk.js',
    assetModuleFilename: 'media/[hash:10][ext][query]',
    clean: true, // 打包前清空 dist
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
        test: /\.(png|jpe?g|gif|svg|webp)$/,
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
        test: /\.[jt]sx?$/, // 同时处理 js/jsx/ts/tsx
        include: path.resolve(__dirname, '../src'),
        loader: 'babel-loader',
        options: {
          cacheDirectory: true, // 开启babel缓存，提升打包速度
          cacheCompression: false,
          // 生产环境移除 react-refresh/babel
          plugins: []
        }
      },
    ]
  },
  plugins: [
    new EslintWebpackPlugin({
      context: path.resolve(__dirname, '../src'),
      exclude: 'node_modules',
      configType: 'eslintrc'
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../public/index.html'),
      // 生产可以开启 html 压缩（html-webpack-plugin 默认生产环境会压缩）
      minify: true
    }),
    // 抽离css成独立文件
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:10].css',
      chunkFilename: 'css/[name].[contenthash:10].chunk.css'
    }),
    new WebpackAssetsManifest({
      output: 'asset-manifest.json',
      entrypoints: true, // 开启入口分组，会把css/js归类
      writeToDisk: true,
      publicPath: '/',
    }),
    // TS 类型检查（生产构建时确保类型错误会导致构建失败）
    new ForkTsCheckerWebpackPlugin()
  ],
  mode: 'production',
  devtool: 'source-map', // 单独生成sourcemap，线上可选择关闭改成 false
  optimization: {
    // chunkIds: 'named',
    splitChunks: {
      chunks: 'all',
    },
    runtimeChunk: 'single',
    // runtimeChunk: {
    //     name: entrypoint => `runtime~~${entrypoint.name}`,
    // },
    minimizer: [
      `...`, // 保留webpack内置的js压缩 Terser
      new CssMinimizerPlugin() // css压缩
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
}
