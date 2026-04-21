import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Only test pure-function engines. No DOM, no Next.js, no network.
    include: ["lib/**/*.test.ts"],
    environment: "node",
    testTimeout: 5000,
    // Fail fast if anyone hits the network from a pure-function test
    globals: false,
  },
});
