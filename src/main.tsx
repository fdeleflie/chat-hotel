import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { handleFirebaseApi } from './firebaseInterceptor';

const originalFetch = window.fetch.bind(window);

try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    get: function() {
      return async (...args: any[]) => {
        const [resource, config] = args;
        const url = typeof resource === 'string' 
          ? resource 
          : resource instanceof Request 
            ? resource.url 
            : String(resource);
        
        const method = config?.method || 'GET';
        const isBackup = url.includes('/api/backup');
        const isRestoringToFirebase = window.location.hash === '#migrate';

        // Si on est en train de migrer (#migrate), on laisse passer le GET /api/backup pour qu'il touche le vrai serveur local (SQLite).
        if (isBackup && isRestoringToFirebase && method === 'GET') {
          return originalFetch(...args);
        }
        
        if (url.startsWith('/api/') || url.includes('/api/')) {
          console.log("Intercepting fetch to:", url);
          return handleFirebaseApi(url, config);
        }
        
        return originalFetch(...args);
      };
    }
  });
} catch (e) {
  console.error("Failed to patch window.fetch:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
