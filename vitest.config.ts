import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { exclude: ["test/vscode/**", "node_modules/**", "dist/**"] }
});
