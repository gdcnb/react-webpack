import {useState, useEffect, lazy, Suspense} from 'react';
import {importPdpPage} from '@/router';
import './index.scss';

const HomeSubpage = lazy(() => import('./HomeSubpage'));

export default function Home() {
  const [count, setCount] = useState(3);
  const [toLoadSubpage, setToLoadSubpage] = useState(false);
 
  useEffect(() => {
    const timmer = setInterval(() => {
      setCount(c => {
        console.log('----> home setinterval pre count:  ', c);
        return c + 1;
      });
    }, 3000);

    return () => clearInterval(timmer);
  }, []);
  
  useEffect(() => {
    setTimeout(() => {
      console.log('开始预加载非首屏页面');
      // importPdpPage();
      setToLoadSubpage(true);
    }, 3000);
  }, [])


  return (
    <div>
      <h2 className='home-title'>Home page1 {count}</h2>
      {
        toLoadSubpage &&
        <Suspense fallback={<div>Loading</div>}>
          <HomeSubpage></HomeSubpage>
        </Suspense>
      }
    </div>
  )
}