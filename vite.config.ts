import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Path relatif: hasil build bisa ditaruh di sub-folder mana pun (mis. GitHub Pages /nama-repo/).
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
  test: { environment: 'node' },
});
