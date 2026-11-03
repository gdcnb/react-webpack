# Webpack 工程化复习笔记

> 本文档总结自一次 React + Webpack5 手写工程化实战对话，覆盖：dev/prod 配置、ESLint9 Flat Config、缓存优化（runtimeChunk / chunkIds / moduleIds）、框架级构建体系（ICE / Umi / Monorepo）、TypeScript 接入等核心知识点，适合面试复习与实操回查。

---

## 目录

1. [webpack 配置：dev 与 prod 的差异](#一webpack-配置dev-与-prod-的差异)
2. [环境变量：cross-env 与 NODE_ENV](#二环境变量cross-env-与-node_env)
3. [ESLint：规则、VSCode 与 ESLint9 Flat Config](#三eslint规则vscode-与-eslint9-flat-config)
4. [模块解析报错：Module not found 排查思路](#四模块解析报错module-not-found-排查思路)
5. [缓存优化三件套：runtimeChunk / chunkIds / moduleIds](#五缓存优化三件套runtimechunk--chunkids--moduleids)
6. [框架级构建体系：ICE 深度拆解](#六框架级构建体系ice-深度拆解)
7. [框架级构建体系：Umi 与 ICE 对比](#七框架级构建体系umi-与-ice-对比)
8. [Monorepo 概念与 pnpm 模板](#八monorepo-概念与-pnpm-模板)
9. [TypeScript 接入与类型检查](#九typescript-接入与类型检查)
10. [面试速记表](#十面试速记表)

---

## 一、webpack 配置：dev 与 prod 的差异

### 1.1 核心差异总表

| 维度 | dev | prod |
|---|---|---|
| 样式 | `style-loader` 注入 JS | `MiniCssExtractPlugin` 抽离 CSS 文件 + `CssMinimizerPlugin` 压缩 |
| HMR | `hot: true` + `ReactRefreshWebpackPlugin` + babel `react-refresh/babel` | 全部移除 |
| devtool | `cheap-module-source-map` | `source-map`（单独生成 map，也可 `false`） |
| output | `path: undefined`（内存） | `path: dist` + `clean: true` + `[contenthash]` |
| babel | 开启 react-refresh 插件 | 移除，可开 `cacheDirectory: true` |
| devServer | 配置 | 不配置 |
| 模式 | `mode: 'development'` | `mode: 'production'`（自动 Tree Shaking、压缩） |

### 1.2 生产配置关键代码

```js
// webpack.prod.js
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const getStyleLoader = (pre) => {
  return [
    MiniCssExtractPlugin.loader, // 生产用这个替代 style-loader
    'css-loader',
    { loader: 'postcss-loader', options: { postcssOptions: { plugins: ['postcss-preset-env'] } } },
    pre,
  ].filter(Boolean);
}

module.exports = {
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'static/js/[name].[contenthash:10].js',
    chunkFilename: 'static/js/[name].[contenthash:10].chunk.js',
    assetModuleFilename: 'static/media/[hash:10][ext][query]',
    clean: true, // 打包前清空 dist
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:10].css',
      chunkFilename: 'static/css/[name].[contenthash:10].chunk.css'
    })
  ],
  optimization: {
    splitChunks: { chunks: 'all' },
    runtimeChunk: { name: entrypoint => `runtime~~${entrypoint.name}` },
    minimizer: [
      `...`, // 保留 webpack 内置 Terser JS 压缩
      new CssMinimizerPlugin()
    ]
  },
  devtool: 'source-map',
  devServer: undefined
}
```

### 1.3 配套依赖

```bash
npm install mini-css-extract-plugin css-minimizer-webpack-plugin -D
```

### 1.4 package.json scripts

```json
{
  "scripts": {
    "start": "webpack serve --config ./config/webpack.dev.js",
    "build": "webpack --config ./config/webpack.prod.js"
  }
}
```

---

## 二、环境变量：cross-env 与 NODE_ENV

### 2.1 两个 NODE_ENV 的作用域（易混点）

| 来源 | 作用域 | 说明 |
|---|---|---|
| webpack `mode` | **打包后的业务代码** | webpack 自动通过 DefinePlugin 注入 `process.env.NODE_ENV`，React/ReactDOM 内部靠它切换开发/生产版本 |
| `cross-env NODE_ENV=xxx` | **Node 侧（webpack 配置文件执行时）** | 配置文件里 `process.env.NODE_ENV` 才能读到；跨平台兼容（Windows cmd 不能直接 `NODE_ENV=xxx`） |

### 2.2 什么时候必须用 cross-env

- 单配置文件 + 环境变量分支时**必须**：

```js
const isDev = process.env.NODE_ENV === 'development';
module.exports = merge(common, isDev ? devConfig : prodConfig)
```

```json
"start": "cross-env NODE_ENV=development webpack serve",
"build": "cross-env NODE_ENV=production webpack"
```

- 双配置文件（webpack.dev.js / webpack.prod.js 写死 mode）时：**可省略 cross-env**，够用。

---

## 三、ESLint：规则、VSCode 与 ESLint9 Flat Config

### 3.1 为什么 `var a = 1;` 不报错

- `eslint:recommended` **不包含 `no-var` 规则**，需手动开启：

```js
rules: {
  'no-var': 'warn',
  // 推荐加 prefer-const：能用 const 就强制 const
}
```

### 3.2 VSCode ESLint 插件不生效排查清单

1. **本地必须安装 eslint**：`npm i eslint -D`（插件优先读项目 node_modules，不是全局）
2. **.vscode/settings.json** 配置：

```json
{
  "eslint.enable": true,
  "eslint.validate": ["javascript", "javascriptreact"],
  "eslint.run": "onType"
}
```

3. 改完配置执行 `Ctrl+Shift+P` → `ESLint: Restart ESLint Server`
4. 检查 `.eslintignore` 是否忽略了目标文件
5. 命令行验证配置本身是否有效：`npx eslint src/index.js`
6. 看输出面板（VSCode 底部 → 输出 → ESLint）抓加载失败原因

> ⚠️ 记住：webpack 的 `EslintWebpackPlugin` 是**打包时校验**；VSCode 插件是**编辑器实时校验**，两套独立。

### 3.3 ESLint9 Flat Config 迁移

**报错**：`ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`
ESLint9 默认使用 Flat Config（`eslint.config.js`），不再默认读取 `.eslintrc.*`。

**方案 A：临时兼容（快速跑通）**

```bash
ESLINT_USE_FLAT_CONFIG=false npx eslint src/index.js
# npm script 跨平台：
"lint": "cross-env ESLINT_USE_FLAT_CONFIG=false eslint src"
```

**方案 B：彻底迁移为 eslint.config.mjs（推荐）**

```js
// eslint.config.mjs（mjs 后缀免改 package.json type:module）
import js from '@eslint/js';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import babelParser from '@babel/eslint-parser';

export default [
  { ignores: ['node_modules/**', 'dist/**'] },

  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReactHooks.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        requireConfigFile: false,
        babelrc: false,
        configFile: false,
        babelOptions: {
          presets: [
            ['@babel/preset-env'],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }
      },
      globals: { ...globals.browser, ...globals.es2021, ...globals.node }
    },
    settings: { react: { version: '19' } },
    rules: {
      'no-var': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-console': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
];
```

**报错**：`ConfigError: Config (unnamed): Key "plugins": Cannot redefine plugin "react".`

> 原因：`pluginReact.configs.flat.recommended` **内部已注册 `plugins: { react }`**，再手动写 `plugins: { react }` 会重复定义。
> 解决：**删掉自己配置块里的 `plugins` 字段**，直接用 recommended 配置自带的注册。

### 3.4 Flat Config 要点

- 老 `extends: ['eslint:recommended', 'plugin:react/recommended']` 写法失效 → 改为导入 `xxx.configs.recommended` 放进数组
- 数组顺序靠前先加载，后面的 rules 覆盖前面的
- `@eslint/js` 需固定版本适配 eslint9：`npm i @eslint/js@9 -D`
- 安装报 ERESOLVE 时：`@eslint/js@10` 要求 eslint10，与本地 eslint9 冲突

---

## 四、模块解析报错：Module not found 排查思路

### 4.1 典型报错

```
Module not found: Error: Can't resolve '../page/Pdp' in '.../src/page/Home'
  /Users/.../src/page/page/Pdp doesn't exist
```

### 4.2 排查清单

1. **相对路径写错层级**：从 `src/page/Home/index.jsx` 引用 Pdp 应为 `../Pdp`，而报错显示解析到 `src/page/page/Pdp`，说明路径多了一层
2. **alias 配置错误**（`@` 指向）：

```js
resolve: {
  alias: {
    '@': path.resolve(__dirname, '../src') // 注意目录层级
  }
}
```

> 踩坑案例：配置文件在 `config/` 目录时，`__dirname` 是 `config/`，必须 `../src`；如果写成 `config/src` 就会解析失败（报错日志会显示 `aliased with mapping '@': '.../config/src'`）。

3. 检查 `resolve.extensions` 是否包含 `.jsx` / `.tsx`

---

## 五、缓存优化三件套：runtimeChunk / chunkIds / moduleIds

### 5.1 runtimeChunk：'single'

**作用**：把 webpack 的 runtime（模块加载器 `__webpack_require__`、模块缓存、chunk 加载逻辑、chunk id 映射表）抽离成独立 chunk。

| 取值 | 行为 |
|---|---|
| `false`（默认） | runtime 合并进 entry bundle |
| `true` / `'multiple'` | 每个入口单独一份 runtime |
| `'single'` | **所有入口共用一份 runtime**（框架首选） |

**价值（面试高频）**：
1. **稳定缓存**：runtime 内含 chunk id 映射，若不抽离，任何模块顺序变化都导致整个 bundle hash 变化，缓存全失效
2. **多入口复用**：多页面不用每个页面重复加载引导代码
3. 配合 `splitChunks` 分包体系，依赖关系变更不污染 vendor 包 hash

**缺点**：多一个 JS 请求（HTTP2 多路复用下影响小）

### 5.2 chunkIds：natural / named / deterministic

| 取值 | 规则 | ID 样子 | 缓存稳定性 | 适用场景 |
|---|---|---|---|---|
| `natural` | 按解析顺序自增数字 | 1,2,3 | ❌ 极差（顺序一变全变） | 简单调试，生产禁用 |
| `named` | 用 chunk name 作 ID | `main`、`Pdp`、`vendors` | ✅ 稳定 | 开发环境（可读性好） |
| `deterministic` | 基于模块路径 hash 出固定短数字 | 838, 942 | ✅✅ 最优（不受顺序影响） | **生产环境首选** |

要点：
- `natural` 新增一个异步 chunk 会让后面所有 chunk id 移位 → runtime hash 变 → 缓存失效
- `named` 可用 `import(/* webpackChunkName: "Pdp" */ './Pdp')` 指定名字；可读性好但 ID 是字符串、体积偏大
- `deterministic` 是 webpack5 为长效缓存推出的方案，ICE / Umi / CRA 默认

### 5.3 moduleIds：natural / named / deterministic

- 和 chunkIds 同语义，但作用对象是**单个模块**（module）而非打包块（chunk）
- moduleIds 写入 `__webpack_modules__` 映射表；chunkIds 用于异步加载 `__webpack_require__.e`
- 两者任一变化都会导致 runtime hash 变化

### 5.4 生产/开发标准配套

```js
// webpack.prod.js
optimization: {
  runtimeChunk: 'single',
  moduleIds: 'deterministic',
  chunkIds: 'deterministic',
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      framework: {
        test: /[\\/]node_modules[\\/](react|react-dom)/,
        name: 'framework',
        priority: 40
      },
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: 20
      }
    }
  }
}
```

```js
// webpack.dev.js（不关心缓存，优先可读性）
optimization: {
  moduleIds: 'named',
  chunkIds: 'named'
}
```

> 知识点补丁：webpack4 时代用 `HashedModuleIdsPlugin` 实现类似 deterministic 效果，webpack5 内置。

---

## 六、框架级构建体系：ICE 深度拆解

### 6.1 ICE 定位

ICE（飞冰）是阿里**上层研发框架（icejs）**，不是简单 webpack 模板：内置约定式路由、运行时（icestore / icestark 微前端）、构建体系。

### 6.2 ICE vs 手写 webpack 差异总表

| 维度 | 手写 webpack | ICE(icejs) |
|---|---|---|
| 配置范式 | 完整原生 webpack 对象，dev/prod 两份 | 声明式上层配置 + `webpack(config) => config` 回调增量修改 |
| entry | 写死 `./src/index.js` | 约定式：扫描 `src/pages/` 自动生成（SPA 单 entry / MPA 多 entry） |
| HTML | 手动 `new HtmlWebpackPlugin` | 内置自动生成 |
| 样式 loader | 手写 getStyleLoader 组装 | 内置 css/less/sass 链路，用 `@ice/webpack-modify` 工具修改 |
| ESLint | 手动 new EslintWebpackPlugin + 自维护配置 | 内置集成，框架锁定版本 |
| HMR | 手动 ReactRefreshWebpackPlugin | 内置 react-refresh 开箱即用 |
| splitChunks | 自己写 | 内置 framework / vendors / common 分包 |
| alias | 手动配置 | 默认内置 `@ -> src` |
| 模式切换 | 维护两份配置 + cross-env | 框架内部接管，`npm start` / `npm run build` 自动切换 |

### 6.3 ICE 内置 webpack 骨架（还原版）

> 注意：ICE 的 webpack config 是动态拼接，以下为从源码反向整理的骨架，用于对照学习。

```js
const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: {}, // SPA：固定 src/app.ts；MPA：自动扫描 src/pages/*/index
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: isDev ? 'js/[name].js' : 'js/[name].[contenthash:8].js',
    chunkFilename: isDev ? 'js/[name].chunk.js' : 'js/[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    publicPath: '/',
    clean: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env'],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ],
          plugins: isDev ? ['react-refresh/babel'] : []
        }
      },
      // css / less / sass 三条独立 rule，内置 postcss
      // 图片 asset、字体 asset/resource
    ]
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        framework: { test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, name: 'framework', priority: 40 },
        vendors: { test: /[\\/]node_modules[\\/]/, name: 'vendors', priority: 20 },
        common: { name: 'common', minChunks: 2, priority: 10 }
      }
    },
    runtimeChunk: 'single',
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()]
  },
  plugins: [
    // 每个页面自动生成 HtmlWebpackPlugin
    // dev: ReactRefreshWebpackPlugin；prod: MiniCssExtractPlugin
  ]
}
```

### 6.4 ICE 自动扫描 pages 的实现（SPA vs MPA）

**关键澄清**：ICE v3 默认 SPA 模式**不是**把 pages 扫描成多个 webpack entry！

| 模式 | 开启方式 | entry | 扫描用途 |
|---|---|---|---|
| SPA（默认） | 无需配置 | **固定单 entry `src/app.ts`** | 扫描 pages → 生成**路由表**（虚拟模块 `ice/routes`） |
| MPA | `mpa: true` | **自动扫描 `src/pages/*/index.*` 生成多个 entry** | 生成 entry 对象 + 批量 HtmlWebpackPlugin |

**SPA 虚拟路由模块原理**：
1. `fast-glob` 扫描 `src/pages/**/*.{tsx,jsx,ts,js}`，忽略 `components`、`_` 开头文件
2. 路径翻译成路由对象（`about.tsx → /about`、`[id].tsx → /:id`）
3. 生成虚拟代码字符串，用 webpack 虚拟模块（`\0` 前缀 + loader 拦截）注入，磁盘上不存在该文件
4. `src/app.ts` 通过 `import { routes } from 'ice/routes'` 拿到路由表，交给运行时路由
5. dev 模式 chokidar 监听 pages，文件变更自动重新生成路由表并触发重编译

**MPA 伪代码**：

```ts
const files = await fg('src/pages/*/index.{js,jsx,ts,tsx}', { cwd: root, absolute: true });
const entry = {};
const htmlPlugins = [];
for (const file of files) {
  const dirName = path.basename(path.dirname(file));
  entry[dirName] = file;
  htmlPlugins.push(new HtmlWebpackPlugin({
    filename: `${dirName}.html`,
    chunks: [dirName, 'runtime', 'vendors']
  }));
}
// 在 onGetConfig 钩子中覆盖 webpack entry 与 plugins
```

> 本质：**Node 层提前扫描文件 → 生成配置/虚拟代码 → 丢给 bundler**，属于构建时元编程。Umi / Next / ICE 约定路由同源。

### 6.5 如何打印 ICE 真实 webpack 配置

```ts
// ice.config.mts
import { defineConfig } from '@ice/app';
export default defineConfig(() => ({
  webpack: (config) => {
    const fs = require('fs');
    fs.writeFileSync('./ice-webpack-config.json', JSON.stringify(config, null, 2));
    return config;
  }
}));
```

运行 `npm start` / `npm run build` 后在根目录生成 json。dev / prod 各跑一次对比。

> 注意：ICE v3 部分编译提速走 esbuild 预处理，不在 webpack config 里；`webpack(config)` 回调拿到的是所有插件执行完之后的最终 config。

### 6.6 SPA 模式下配置多个 webpack entry（手动版）

**适用场景**：拆分独立脚本（埋点/监控）、预加载入口等；**不是**把路由页面拆成 entry（页面分包用 `import()` 异步 chunk）。

```js
module.exports = {
  entry: {
    main: './src/index.js',      // SPA 主入口
    tracker: './src/tracker.js'  // 额外独立入口
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      chunks: ['main', 'tracker'] // 数组顺序 = script 注入顺序！
    })
  ],
  optimization: {
    runtimeChunk: 'single',
    splitChunks: { chunks: 'all' } // 跨 entry 抽公共依赖
  }
}
```

**常见坑**：
1. `runtimeChunk: 'single'` 保证多 entry 共用一份 runtime
2. 两个 entry 都依赖 react → splitChunks 抽取共享 vendors，只加载一次
3. ❌ 不要把 `/home`、`/pdp` 路由页面做成 entry：会导致 react 实例重复、状态丢失，本质变成伪 MPA

---

## 七、框架级构建体系：Umi 与 ICE 对比

### 7.1 生成流程同源

```
umi dev/build
  → 加载 .umirc.ts / config/config.ts
  → 初始化 Service + 插件体系
  → 插件生命周期（modifyConfig / chainWebpack / modifyWebpackConfig）
  → 路由插件扫描 src/pages 生成虚拟模块 @@/routes
  → entry 固定为虚拟文件 @@/umi.ts（SPA 单 entry）
  → 组装完整 webpack config → 交给 webpack 编译
```

- 产物缓存目录 `.umi/`（生成运行时入口、路由表），是 Umi 标志性目录
- MPA（`mpa: true`）同样自动生成多 entry + 批量 HtmlWebpackPlugin

### 7.2 相同点

1. 都是 Node 层插件框架，扫描 pages、生成虚拟模块、动态组装 webpack config
2. 生产优化策略一致：`runtimeChunk: 'single'` + `deterministic` ids + splitChunks 拆 framework/vendors
3. HMR 都用 react-refresh；MPA 逻辑一致；contenthash 缓存策略一致

### 7.3 核心差异表

| 维度 | Umi4（webpack 模式） | Ice3 |
|---|---|---|
| 构建引擎 | **Webpack + Vite 双引擎** | 仅 Webpack |
| 开发加速 | **MFSU**（Module Federation 预编译依赖，node_modules 只编译一次） | esbuild 局部转译，无 MFSU |
| webpack 修改方式 | `chainWebpack`（webpack-chain）优先 + `modifyWebpackConfig` | 原生 config + `@ice/webpack-modify`，**无 chain** |
| 约定路由 | src/pages，虚拟模块 `@@/routes` | src/pages，虚拟模块 `ice/routes` |
| SPA entry | 虚拟文件 `@@/umi.ts`（.umi 缓存目录） | `src/app.ts` |
| CSS 预处理器 | less 内置，sass 需插件 | css/less/sass 全内置 |
| 主推场景 | 企业中后台（dva/权限/qiankun 微前端/国际化） | H5、移动端、SSG/SSR 一体化、多端 |
| 插件体系 | Service 内核重、生命周期细、扩展维度多 | 精简轻量，钩子少 |

### 7.4 选型一句话

- 中后台 + 大型项目 dev 提速 + 开箱即用权限/微前端 → **Umi**
- H5 / 营销页 / 静态站点 / SSG/SSR + 想要 webpack 可控性 → **Ice**

---

## 八、Monorepo 概念与 pnpm 模板

### 8.1 概念

> **Monorepo**：把多个相互关联的包/项目放进**同一个 Git 仓库**管理（对比 Multi-repo 一个包一个仓库）。

典型结构：

```
root/
├── package.json            # 根：统一脚本 + workspace 管理
├── pnpm-workspace.yaml
├── packages/               # 可复用包（组件库、工具、构建配置，可发布 npm）
└── apps/                   # 业务应用（不发布 npm）
```

**优势**：
1. 原子修改、跨包联动（一次 commit 改 utils + 依赖它的 ui）
2. workspace 本地源码直接互相引用，**不需要发包 / npm link**
3. 统一 eslint / prettier / tsconfig / CI 规范
4. 批量版本管理、发布（changesets / lerna）

**缺点**：
1. 仓库体积大、clone/CI 变慢
2. 权限隔离弱（无法细粒度控制谁改哪个包）
3. 必须配合增量构建工具（Turbo / Nx）否则全量构建很慢

**主流工具链**：`pnpm workspace + turbo + changesets`（ice / vite 均为此组合）

> 面试区分：workspace 是包管理器提供的能力（本地 link），monorepo 是仓库组织形式；webpack、vue、vite、ice 全是 monorepo。

### 8.2 极简 pnpm monorepo 模板（复刻 ice 结构）

```bash
mkdir ice-like-monorepo && cd ice-like-monorepo
pnpm init -y
```

**pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**根 package.json**

```json
{
  "name": "@repo/root",
  "private": true,
  "scripts": {
    "dev:spa": "pnpm --filter react-spa dev",
    "build:spa": "pnpm --filter react-spa build"
  }
}
```

**packages/webpack-config/package.json**（公共构建包）

```json
{
  "name": "@repo/webpack-config",
  "private": true,
  "main": "src/index.js",
  "peerDependencies": { "webpack": "^5.0.0" }
}
```

**apps/react-spa/package.json**（业务应用，关键行）

```json
{
  "name": "react-spa",
  "scripts": { "dev": "webpack serve", "build": "webpack" },
  "devDependencies": {
    "@repo/webpack-config": "workspace:*",
    "webpack": "^5.96.1",
    "webpack-cli": "^5.1.4",
    "webpack-dev-server": "^5.1.0"
  }
}
```

> `"workspace:*"` 协议：直接关联本地 packages/webpack-config，不用发包。
> 业务侧 `webpack.config.js` 只需 `require('@repo/webpack-config')` 调用工厂函数，改公共包源码立即生效。

---

## 九、TypeScript 接入与类型检查

### 9.1 推荐方案：babel-loader + @babel/preset-typescript

> 与现有 babel 链路一致；TS 只做**类型擦除**，不做类型检查（和 Umi / Ice 默认方案一致）。

**安装**

```bash
pnpm add -D typescript @babel/preset-typescript @types/react @types/react-dom
```

**tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

**webpack 配置改动**（三处）

```js
// 1. babel-loader 的 test 与 presets
{
  test: /\.(js|jsx|ts|tsx)$/,
  exclude: /node_modules/,
  loader: 'babel-loader',
  options: {
    presets: [
      ['@babel/preset-env'],
      ['@babel/preset-react', { runtime: 'automatic' }],
      ['@babel/preset-typescript']  // 新增
    ],
    plugins: isDev ? ['react-refresh/babel'] : []
  }
},
// 2. resolve.extensions
resolve: { extensions: ['.js', '.jsx', '.ts', '.tsx'] }
// 3. entry 可改 src/index.tsx
```

**ESLint 同步**：parserOptions.babelOptions.presets 增加 `['@babel/preset-typescript']`，并加 overrides 让 eslint 校验 ts/tsx 文件。

**关键约束**：`isolatedModules` 必须开；不能写 `export =` / `import = require()` / const enum 等 babel 不支持的语法。

### 9.2 fork-ts-checker-webpack-plugin

> 弥补 babel 不做类型检查的缺陷：**fork 独立子进程执行 tsc**，把类型错误输出到 webpack 构建日志。

```js
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
plugins: [
  new ForkTsCheckerWebpackPlugin({
    typescript: { configFile: path.resolve(__dirname, 'tsconfig.json') },
    // async: false  // 同步模式：类型错误会阻塞构建（速度变慢）
  })
]
```

**优点**：构建期间自动类型检查、独立进程不阻塞主编译、错误格式统一。

**缺点（面试重点）**：
1. **默认异步**：webpack 打包成功，类型错误晚几秒才出现，**不会阻止打包产出**
2. 每次编译都跑 tsc，大型项目拖慢 dev 热更新
3. 偶尔缓存 / watch 监听异常

**官方（Umi / Ice）推荐方案**：不集成插件，webpack 只负责转译，类型检查放独立脚本 / CI / git hook：

```json
"scripts": {
  "type-check": "tsc --noEmit",
  "type-check:watch": "tsc --noEmit --watch"
}
```

### 9.3 三方案对比

| 方案 | 类型检查 | 转译 | 特点 |
|---|---|---|---|
| ts-loader | ✅ 有（主线程） | ✅ 有 | 慢，基本被淘汰 |
| babel-loader + preset-typescript | ❌ 无 | ✅ 有 | 快，类型校验靠 tsc 单独跑 |
| babel-loader + fork-ts-checker | ✅ 有（子进程） | ✅ 有（babel） | 快，异步检查不阻塞打包 |

---

## 十、面试速记表

| 问题 | 一句话答案 |
|---|---|
| dev / prod 配置差异 | 样式抽离（MiniCssExtractPlugin）、contenthash、clean、去 HMR/devServer、source-map、压缩 |
| cross-env 作用 | 给 Node 进程设置 NODE_ENV（配置阶段读取），跨平台；webpack mode 注入的是打包后代码里的 NODE_ENV |
| ESLint9 找不到配置 | 默认 Flat Config（eslint.config.js），可用 `ESLINT_USE_FLAT_CONFIG=false` 兼容或迁移 |
| Cannot redefine plugin | flat recommended 自带插件注册，不要重复写 plugins 字段 |
| runtimeChunk: 'single' | 抽 runtime 为单一公共 chunk，稳定 hash，配合长效缓存 |
| chunkIds/moduleIds | natural 顺序编号不稳定；named 可读性好体积大；deterministic 路径 hash 固定数字，生产标准 |
| ICE/Umi 约定路由 | Node 层 glob 扫描 pages → 生成虚拟路由模块，SPA 单 entry，MPA 才多 entry |
| SPA 多 entry 用途 | 独立脚本（埋点/监控），配 HtmlWebpackPlugin chunks 注入；页面分包用 import() |
| Monorepo | 多包单仓库，workspace 本地联动，pnpm+turbo+changesets 标准组合 |
| TS 接入 | babel preset-typescript 只擦类型；类型检查用 tsc --noEmit 或 fork-ts-checker（异步） |
| fork-ts-checker 缺点 | 默认异步不阻止打包、dev 有性能开销，Umi/Ice 不默认内置 |

---

*生成时间：2026-11-03*
*来源：react-webpack 手写工程化实战对话总结*
