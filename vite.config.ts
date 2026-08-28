import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // Si tu repositorio se llama 'binance-analyzer', coloca '/binance-analyzer/'
    // O usa './' para rutas relativas automáticas:
    base: 'binance-quantitative-analyzer',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
