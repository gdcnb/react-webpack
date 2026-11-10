/**
 * 注意：本目录使用 ESLint 9 扁平配置，规则全部在 eslint.config.mjs 中。
 * 这个文件是 webpack 版 ../.eslintrc.js 的副本，Vite 版已不再读取，仅留作对照。
 */
module.exports = {
    root: true,
    parser: '@babel/eslint-parser',
    parserOptions: {
        sourceType: 'unambiguous',
        requireConfigFile: false,
        babelOptions: {
            configFile: require('path').resolve(__dirname, 'babel.config.cjs'),
        },
        ecmaFeatures: {
            jsx: true,
        },
    },
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    ignorePatterns: ['dist', 'node_modules'],
    rules: {},
};
