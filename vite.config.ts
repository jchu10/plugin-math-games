import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
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