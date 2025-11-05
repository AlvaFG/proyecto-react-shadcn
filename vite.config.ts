import path from "path";
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_BASE_URL || 'http://localhost:8080';

  console.log('[VITE] Proxy target →', target); // 👈 útil para confirmar

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      proxy: {
        // si en FE hacés fetch('/api/products') → BK recibe '/products'
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        // si usás '/locations' directo desde el FE, esto lo deja tal cual
        '/locations': { target, changeOrigin: true, secure: false },
      },
    },
  };
});

