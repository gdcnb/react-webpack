import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, 'src');

/**
 * 等价于 webpack.prod.js 里的 WebpackAssetsManifest({ entrypoints: true })
 * Vite 没有内置 manifest 的「entrypoints 分组」格式，这里用插件 API 自己产一份。
 * 说明：vite 自带的 build.manifest 生成的是 { "src/index.tsx": { file, css, isEntry } } 格式，
 *      两者要的东西不一样，这里保持与 webpack 版输出结构一致，便于对比。
 */
function assetManifest(): Plugin {
  let base = '/';
  return {
    name: 'demo-asset-manifest',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base.endsWith('/') ? config.base : `${config.base}/`;
    },
    generateBundle(_options, bundle) {
      const js = new Set<string>();
      const css = new Set<string>();
      const assets = new Set<string>();
      const entrypoints: Record<string, string[]> = {};
      const withBase = (fileName: string) => `${base}${fileName}`;

      for (const item of Object.values(bundle)) {
        const { fileName } = item;
        if (fileName.endsWith('.map') || fileName === 'asset-manifest.json') {
          continue;
        }
        if (item.type === 'chunk') {
          // rolldown/vite 会把该 chunk 依赖的 css 挂在 viteMetadata 上
          const importedCss: string[] = [...(item.viteMetadata?.importedCss ?? [])];
          js.add(withBase(fileName));
          importedCss.forEach((file) => css.add(withBase(file)));
          if (item.isEntry) {
            entrypoints[item.name] = [withBase(fileName), ...importedCss.map(withBase)];
          }
        } else if (fileName.endsWith('.css')) {
          css.add(withBase(fileName));
        } else {
          assets.add(withBase(fileName));
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify(
          {
            entrypoints,
            js: [...js].sort(),
            css: [...css].sort(),
            assets: [...assets].sort(),
          },
          null,
          2,
        ),
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [
      react(), // 等价于 babel-preset-react + react-refresh + fork-ts-checker(类型检查挪到 npm script)
      eslint({
        include: ['src/**/*.{js,jsx,ts,tsx}'],
        exclude: ['node_modules', 'dist'],
        cache: false,
        lintOnStart: false, // 启动时全量检查太慢，改为改动时增量检查
        failOnError: isBuild, // 开发环境只告警，生产构建直接失败（对齐 webpack 版的 EslintWebpackPlugin）
        failOnWarning: false,
      }),
      assetManifest(),
    ],

    resolve: {
      // 等价于 webpack.resolve.alias
      alias: {
        '@': srcDir,
      },
      // Vite 默认值已包含 .tsx/.ts/.jsx/.js/.json，这里显式写出来便于对照
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },

    css: {
      // Vite 装好 sass/less/stylus 后自动处理，无需 sass-loader/css-loader 链路；
      // 生产环境 css 由 lightningcss 压缩（对齐 CssMinimizerPlugin）
      devSourcemap: true,
    },

    server: {
      host: 'localhost',
      // webpack 版占 3010，这里用 3011，方便两个构建同时起服务做对比
      port: 3011,
      strictPort: true,
      open: true,
      // 等价于 historyApiFallback: true —— Vite 默认 appType 'spa' 已带 SPA 回退
      appType: 'spa',
    },

    preview: {
      port: 3011,
    },

    build: {
      outDir: 'dist',
      assetsDir: 'dist',
      emptyOutDir: true, // 等价于 webpack output.clean: true
      sourcemap: true, // 等价于 webpack devtool: 'source-map'
      cssCodeSplit: true, // 等价于 MiniCssExtractPlugin 的按 chunk 抽离
      assetsInlineLimit: 10 * 1024, // 等价于 asset parser maxSize: 10 * 1024
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          // 对齐 webpack 的 output.filename / chunkFilename / assetModuleFilename
          entryFileNames: 'js/[name]-[hash:10].js',
          chunkFileNames: 'js/[name]-[hash:10].chunk.js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? '';
            if (name.endsWith('.css')) {
              return 'css/[name]-[hash:10][extname]';
            }
            if (/\.(woff2?|ttf|eot)$/.test(name)) {
              return 'media/[name]-[hash:10][extname]';
            }
            return 'media/[name]-[hash:10][extname]';
          },
          /**
           * 等价于 webpack 的 splitChunks: { chunks: 'all' } + runtimeChunk: 'single'
           * - 三方依赖拆成 vendor 包，业务代码改动不影响其缓存
           * - Vite 8（rolldown）里对应 output.codeSplitting，旧写法 advancedChunks 已废弃
           * - rolldown 会自动产出 rolldown-runtime chunk，作用等同于 webpack 的 runtimeChunk: 'single'
           */
          codeSplitting: {
            groups: [
              {
                name: 'vendor',
                test: /node_modules[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  };
});
