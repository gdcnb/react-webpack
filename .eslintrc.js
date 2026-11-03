module.exports = {
    root: true,
    parser: '@babel/eslint-parser',
    parserOptions: {
        sourceType: 'unambiguous',
        requireConfigFile: false,
        // 借助 babel 配置解析，当前 babel.config.js 已包含 preset-typescript，可解析 .ts/.tsx
        babelOptions: {
            configFile: require('path').resolve(__dirname, 'babel.config.js'),
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
