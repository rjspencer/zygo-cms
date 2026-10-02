import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './index.css';
import App from './App';
import { ThemeProvider, useThemeMode } from './context/ThemeModeContext';
import { queryClient } from './queryClient';

const ThemedApp: React.FC = () => {
  const { mode } = useThemeMode();

  return (
    <Theme
      appearance={mode}
      accentColor="iris"
      grayColor="slate"
      panelBackground="translucent"
      radius="medium"
      scaling="100%"
    >
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </Theme>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <ThemedApp />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
