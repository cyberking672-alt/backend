import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);

  import('./App.tsx')
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>,
      );
    })
    .catch((error) => {
      console.error('[LankaBuy Startup Error]:', error);
    });
}
