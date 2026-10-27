import { defineConfig } from "vitest/config"

// Testes com várias conexões ao banco local do CI (npm run test:concorrencia); um arquivo por vez.
export default defineConfig({
  test: {
    include: ["concorrencia/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
