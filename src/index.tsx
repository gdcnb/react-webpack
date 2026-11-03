import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router'
import App from './app';

const container = document.getElementById('root');
if (!container) {
    throw new Error('找不到 #root 挂载节点，请检查 public/index.html');
}
const root = ReactDOM.createRoot(container);
if (root) {
  root.render(<BrowserRouter><App /></BrowserRouter>);
}
