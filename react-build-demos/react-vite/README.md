# react-vite

把仓库根目录的 **react + webpack** 工程（webpack 5 + babel + react-refresh + splitChunks + CSS 抽离 + asset manifest）
1:1 迁移到 **Vite 8（rolldown 内核）** 的对照示例。

`src` 下的源码基本原样拷贝，只改了构建相关的极少数地方（见「源码差异」）。
构建能力逐项对齐，只用 Vite 原生能力代替自定义 loader / plugin 链。

## 快速开始

```bash
cd react-build-demos/react-vite
npm install

npm run dev      # 开发服务器 http://localhost:3011
npm run build    # tsc 类型检查 + vite build -> dist/
npm run preview  # 本地预览 dist 产物
npm run lint     # eslint src（扁平配置）
```

> webpack 版 devServer 用的是 3010，这里用 **3011**，方便两个构建同时起服务对比。

## 目录结构

```
react-vite/
├── index.html            # 入口 HTML（Vite 以 HTML 为入口，不再用 HtmlWebpackPlugin）
├── vite.config.ts        # 唯一构建配置（替代 webpack.dev.js + webpack.prod.js）
├── tsconfig.json         # TS 配置（含 @/* alias，供 IDE 与 tsc 使用）
├── eslint.config.mjs     # ESLint 9 扁平配置
├── babel.config.cjs      # 仅给 ESLint 的 parser 解析 TS 语法用，Vite 构建不读它
├── types/
│   └── vite-plugin-eslint.d.ts   # 该插件 exports 没带 types，补声明
├── src/                  # 与 webpack 版一致
│   ├── index.tsx         # 入口，BrowserRouter 挂载
│   ├── app.tsx
│   ├── router.tsx        # 路由 + 异步 chunk（懒加载）
│   ├── vite-env.d.ts     # vite/client 类型
│   └── page/{Home,Pdp}/
└── dist/                 # 构建产物
    ├── index.html
    ├── asset-manifest.json
    └── static/{js,css,media}/
```

## webpack 能力 → Vite 实现对照

| webpack 配置 | Vite 实现 |
| --- | --- |
| `entry: './src/index.tsx'` + `HtmlWebpackPlugin({template})` | 根目录 `index.html` 里 `<script type="module" src="/src/index.tsx">` |
| `babel-loader` + `@babel/preset-react` / `preset-typescript` | `@vitejs/plugin-react`（esbuild/oxc 转译，无需 babel 链路） |
| `ReactRefreshWebpackPlugin` + `react-refresh/babel` | plugin-react 内置 Fast Refresh，开发态默认开启 |
| `style-loader/css-loader/postcss-loader/sass-loader/less-loader/stylus-loader` | 装 `sass`/`less`/`stylus` 即可，Vite 内置 CSS 处理，无需 loader 链 |
| `MiniCssExtractPlugin` | `build.cssCodeSplit: true`，产物自动落到 `static/css/` |
| `CssMinimizerPlugin` | `build.cssMinify`（默认 lightningcss） |
| `type: 'asset'` + `maxSize: 10 * 1024` | `build.assetsInlineLimit: 10 * 1024` |
| `output.assetModuleFilename` | `build.rollupOptions.output.assetFileNames` |
| `splitChunks: {chunks:'all'}` | `output.codeSplitting.groups`（rolldown 写法，旧 `advancedChunks` 已废弃） |
| `runtimeChunk: 'single'` | rolldown 自动产出 `rolldown-runtime-*.chunk.js` |
| `devtool: 'source-map'` | `build.sourcemap: true` |
| `resolve.alias: {'@': src}` | `resolve.alias: {'@': srcDir}` |
| `devServer: {port, open, hot, historyApiFallback}` | `server: {port, open, appType: 'spa'}`（SPA 回退是默认行为） |
| `EslintWebpackPlugin` | `vite-plugin-eslint`（开发只告警，生产 `failOnError`） |
| `ForkTsCheckerWebpackPlugin` | Vite 不做类型检查，用 `tsc --noEmit` 串在 `npm run build` 前 |
| `WebpackAssetsManifest({entrypoints:true})` | 自定义插件 `demo-asset-manifest`（见 vite.config.ts，输出结构保持一致） |
| `webpack-dev-server` | Vite 原生 dev server（原生 ESM 按需编译，无全量打包） |
| `cross-env NODE_ENV=...` | `vite` / `vite build` 自带 mode，`.env` 用 `import.meta.env.VITE_*` |

## 源码差异（只有一处）

`src/router.tsx`：webpack 用 `/* webpackChunkName: 'home' */` 指定异步 chunk 名，Vite **不支持**该魔法注释，
chunk 名直接来自文件名（`page/Home` → `Home-xxxx.chunk.js`）。命名规则统一在
`build.rollupOptions.output.chunkFileNames` 控制。

其余文件（`index.tsx` / `app.tsx` / `page/**`）与根目录 webpack 版逐字节一致。

## 产物对比

| | webpack | vite |
| --- | --- | --- |
| 入口 js | `js/main.[hash].js` | `static/js/index-[hash].js` |
| 异步 chunk | `js/home.[hash].chunk.js` | `static/js/Home-[hash].chunk.js` |
| 三方依赖 | `js/582.[hash].js`（自动命名） | `static/js/vendor-[hash].chunk.js`（受控命名，更稳） |
| runtime | `js/runtime.[hash].js` | `static/js/rolldown-runtime-[hash].chunk.js` |
| css | `css/home.[hash].chunk.css` | `static/css/Home-[hash].css` |
| manifest | `asset-manifest.json`（entrypoints 分组） | `asset-manifest.json`（同结构，插件生成） |

## 迁移时容易踩的点

1. **`NODE_ENV` / `process.env` 不再自动注入**：改用 `import.meta.env.MODE`、`import.meta.env.VITE_XXX`，或 `define` 显式注入。
2. **`require()` / `module.exports` 不能混用**：本工程 `"type": "module"`，所以配置文件用 `.cjs` 后缀。
3. **`webpackChunkName` 魔法注释无效**，chunk 命名走 `chunkFileNames` + `codeSplitting.groups`。
4. **Vite 不做类型检查**，`tsc --noEmit` 必须单独串在构建脚本里，否则类型错误不会阻断发布。
5. **dev 环境没有 bundle 产物落盘**：模块走原生 ESM（`/node_modules/.vite/deps` 是依赖预构建缓存），排查网络请求时别按 webpack 的思路找 bundle。
6. **ESLint 9 默认扁平配置**：`vite-plugin-eslint` 只会找 `eslint.config.mjs`，老的 `.eslintrc.*` 不再生效（本目录的 `.eslintrc.cjs` 仅作对照保留）。

## 待补（按需）

- 需要兼容老浏览器（如 Chrome < 107）：加 `@vitejs/plugin-legacy`，webpack 版靠 babel preset-env + browserslist。
- 需要分包体积可视化：`rollup-plugin-visualizer` 对应 webpack-bundle-analyzer。
- 需要 CDN 域名：`build.rollupOptions.output.paths` 或 `experimental.renderBuiltUrl`。
