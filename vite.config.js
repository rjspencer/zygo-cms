import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'askama-live-reload',
      handleHotUpdate({ file, server }) {
        if (file.includes('/templates/') && file.endsWith('.html')) {
          server.ws.send({ type: 'full-reload' });
        }
      },
    }
  ],
  server: {
    proxy: {
      // Proxy everything to Wrangler EXCEPT requests for CSS/JS/assets in /public or /src
      '^/(?!src/|public/|@vite/|.*\\.css$).*': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      }
    }
  }
});
