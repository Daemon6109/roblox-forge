const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  files: "test/vscode/**/*.test.cjs",
  workspaceFolder: "./test/fixture",
  launchArgs: ["--disable-extensions", "--disable-workspace-trust"],
  mocha: { ui: "tdd", timeout: 30000 }
});
