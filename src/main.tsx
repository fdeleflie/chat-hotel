import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleFirebaseApi } from './firebaseInterceptor';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : resource.toString();
  
  if ((url.startsWith('/api/') || url.includes('/api/')) && !url.includes('/api/backup') && !url.includes('/api/restore')) {
    console.log("Intercepting fetch to:", url);
    return handleFirebaseApi(url, config);
  }
  
  return originalFetch(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
