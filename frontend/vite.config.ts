/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 前端只调用自己的后端代理；开发期把 /api 代理到 Flask（默认 5001）。
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 监听 0.0.0.0，便于手机/同网设备访问
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
