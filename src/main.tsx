import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {installClientFallbackInterceptor} from './lib/clientFallback.ts';
import './index.css';

// Ensure static deployments (e.g. GitHub Pages) have mock API fallback
installClientFallbackInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
