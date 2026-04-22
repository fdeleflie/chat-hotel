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
        
        if (url.startsWith('/api/') || url.includes('/api/')) {
          console.log("Intercepting fetch to Firebase:", url);
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
