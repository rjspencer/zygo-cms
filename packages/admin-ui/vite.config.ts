import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '');
  const publicWorkerUrl = (
    env.VITE_PUBLIC_SITE_URL ||
    process.env.VITE_PUBLIC_SITE_URL ||
    'http://127.0.0.1:8788'
  ).replace('localhost', '127.0.0.1');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
        '^/media/.*': {
          target: publicWorkerUrl,
          changeOrigin: true,
        },
        '^/preview/.*': {
          target: publicWorkerUrl,
          changeOrigin: true,
        },
        '/style.css': {
          target: publicWorkerUrl,
          changeOrigin: true,
        },
        '^/fonts/.*': {
          target: publicWorkerUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
