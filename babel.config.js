module.exports = {
    sourceType: 'unambiguous',
    presets: [
        ['@babel/preset-env', { modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        // 支持编译 .ts/.tsx（isTSX + allExtensions 让同一份配置同时处理 js/jsx/ts/tsx）
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
    ],
};
