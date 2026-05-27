import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["notebook.png"],
      manifest: {
        name: "Fix Life - 生活计划管理",
        short_name: "FixLife",
        description: "待办、每日进度、随手记与目标管理",
        theme_color: "#4f46e5",
        background_color: "#f9fafb",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "zh-CN",
        icons: [
          {
            src: "notebook.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "notebook.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "notebook.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/mcp/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5277,
    proxy: {
      "/api": {
        target: "http://localhost:8020",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
