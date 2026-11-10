/**
 * vite-plugin-eslint@1.8.1 自己的 package.json exports 没带 types 映射，
 * 在 moduleResolution: bundler 下 TS 解析不到类型，这里补一份最小声明。
 */
declare module 'vite-plugin-eslint' {
  import type { Plugin } from 'vite';

  interface Options {
    include?: string | string[];
    exclude?: string | string[];
    cache?: boolean;
    lintOnStart?: boolean;
    failOnError?: boolean;
    failOnWarning?: boolean;
    emitWarning?: boolean;
  }

  export default function eslintPlugin(options?: Options): Plugin;
}
