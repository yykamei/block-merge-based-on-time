import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/**"],
    },
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.ts"],
    server: {
      deps: {
        inline: ["@actions/core", "@actions/github"],
      },
    },
  },
})
