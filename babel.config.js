module.exports = {
    sourceType: 'unambiguous',
    presets: [
        ['@babel/preset-env', { modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }],
    ],
};
