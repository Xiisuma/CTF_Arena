
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    env: {
      // Absolute URL required so fetch() works in Node/jsdom (no implicit base URL)
      VITE_API_URL: "http://localhost/api.php",
    },
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/hooks/**", "src/api/**", "src/ranks.ts"],
      exclude: ["src/api/client.ts"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 80 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});

