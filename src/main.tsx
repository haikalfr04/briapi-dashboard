import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter (URL: /#/input) agar refresh halaman tidak 404 di hosting statis seperti GitHub Pages.
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DataProvider } from './state/DataContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </StrictMode>,
);
