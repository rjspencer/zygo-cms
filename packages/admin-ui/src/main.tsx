import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './index.css';
import App from './App';
import { ThemeProvider, useThemeMode } from './context/ThemeModeContext';

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
    </Theme>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <BrowserRouter>
          <ThemedApp />
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
}
