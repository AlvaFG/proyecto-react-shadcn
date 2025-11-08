import path from "path";
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/locations': { target, changeOrigin: true, secure: false },
        '/reservations': { target, changeOrigin: true, secure: false },
        '/products': { target, changeOrigin: true, secure: false },
        '/menus': { target, changeOrigin: true, secure: false },
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});