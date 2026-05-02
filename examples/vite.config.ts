import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

export default defineConfig({
    root: __dirname,
    base: '/plugin-math-games/',
    plugins: [react()],
    define: {
        '__PACKAGE_VERSION__': JSON.stringify(version),
    },
    publicDir: resolve(__dirname, '../public'),
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
    },
});
