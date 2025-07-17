import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';

export default defineConfig({
  plugins: [react(), tailwindcss(), crossOriginIsolation(),],
  server: {
    // Vite only applies this to dev server responses
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
