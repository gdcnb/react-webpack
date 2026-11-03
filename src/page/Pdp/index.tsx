import {useState, useEffect} from 'react';
import './index.scss';

export default function Pdp() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2 className='home-title'>Product detail page {count}</h2>
    </div>
  )
}