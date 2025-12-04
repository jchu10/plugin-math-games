import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from 'node:module'; // Import helper

// Safely load the package version for definition
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

export default defineConfig({
    plugins: [react()],
    define: {
        '__PACKAGE_VERSION__': JSON.stringify(version),
    },
    resolve: {
        extensions: [".js", ".ts", ".tsx"],
    },
    server: {
        open: "/dev/index.html",
    },
    optimizeDeps: {
        entries: ["dev/index.html"],
    },
});