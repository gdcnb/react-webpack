import path from 'node:path';
import { fileURLToPath } from 'node:url';
import babelParser from '@babel/eslint-parser';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * ESLint 9 扁平配置（Vite 工程用扁平配置，vite-plugin-eslint 会直接找到这个文件）。
 * 语法解析复用同目录的 babel.config.cjs（该文件只服务于 ESLint，Vite 构建不走 babel）。
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
          configFile: path.resolve(rootDir, 'babel.config.cjs'),
        },
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {},
  },
];
