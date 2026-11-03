import { lazy, Suspense} from 'react';
import { Routes, Route } from "react-router"

export const importHomePage = () => import(/* webpackChunkName: 'home' */"./page/Home");
export const importPdpPage = () => import(/* webpackChunkName: 'pdp' */"./page/Pdp");

// export const importHomePage = () => import("./page/Home");
// export const importPdpPage = () => import("./page/Pdp");

export default function AppRouter() {
  
  const Home = lazy(importHomePage);
  const Pdp = lazy(importPdpPage);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path='/home' element={<Home />}></Route>
        <Route path='/pdp' element={<Pdp />}></Route>
      </Routes>
    </Suspense>
  )
}