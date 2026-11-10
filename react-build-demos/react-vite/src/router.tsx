import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';

/**
 * 与 webpack 版的唯一源码差异：
 * webpack 用魔法注释 webpackChunkName 指定异步 chunk 名，Vite 不支持该注释，
 * chunk 名直接取自文件名（page/Home -> Home-[hash].chunk.js），
 * 统一命名规则放在 vite.config.ts 的 build.rollupOptions.output.chunkFileNames。
 */
export const importHomePage = () => import('./page/Home');
export const importPdpPage = () => import('./page/Pdp');

export default function AppRouter() {
  const Home = lazy(importHomePage);
  const Pdp = lazy(importPdpPage);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/home" element={<Home />}></Route>
        <Route path="/pdp" element={<Pdp />}></Route>
      </Routes>
    </Suspense>
  );
}
