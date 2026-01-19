// @ts-ignore
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

import {defineConfig} from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    minify: false, // temporarily for debugging
  },
});
