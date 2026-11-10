/**
 * 仅用于 ESLint 的 @babel/eslint-parser 解析 TS 语法；
 * Vite 的编译由 esbuild/oxc 完成，不读取这个文件。
 */
module.exports = {
    sourceType: 'unambiguous',
    presets: [
        ['@babel/preset-react', { runtime: 'automatic' }],
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
    ],
};
