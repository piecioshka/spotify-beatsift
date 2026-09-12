import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initLanguage } from './i18n';
import './styles/theme.css';

initLanguage();

const root = document.getElementById('root');
if (!root) throw new Error('Brakuje elementu #root w index.html.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
