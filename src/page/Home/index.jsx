import {useState, useEffect, lazy} from 'react';
import {importPdpPage} from '@/router';
import './index.scss';

export default function Home() {
  const [count, setCount] = useState(0);
 
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
      console.log('开始预加载 pdp 页面');
      importPdpPage();
    }, 0);
  }, [])


  return (
    <div>
      <h2 className='home-title'>Home page {count}</h2>
    </div>
  )
}