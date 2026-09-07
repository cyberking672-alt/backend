import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );

  // Immediately dismiss preloader overlay as React mounts
  const dismiss = () => {
    if (typeof window !== 'undefined' && (window as any).__dismissLankaBuyLoader) {
      (window as any).__dismissLankaBuyLoader();
    }
  };
  requestAnimationFrame(dismiss);
  setTimeout(dismiss, 100);
}

