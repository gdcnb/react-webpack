import {useState, lazy, Suspense} from 'react';
import { Routes, Route, Link } from "react-router"

import AppRouter from './router';

export default function App() {
  const [name, setName] = useState('CNB_test1');

  
  return (
    <>
      <h1>React APP {name}</h1>
      <ul>
        <li><Link to="/home">Home</Link></li>
        <li><Link to="/pdp">Pdp</Link></li>
      </ul>

      <AppRouter></AppRouter>
    </>
  )
}