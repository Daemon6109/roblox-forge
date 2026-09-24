const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vscode = require("vscode");

suite("Roblox Forge extension host", () => {
  const root = () => vscode.workspace.workspaceFolders[0].uri.fsPath;
  const generatedPaths = [".forge", "src", "tests", "wally.toml", "default.project.json"];

  setup(async () => {
    for (const relativePath of generatedPaths) await fs.rm(path.join(root(), relativePath), { recursive: true, force: true });
  });

  teardown(async () => {
    for (const relativePath of generatedPaths) await fs.rm(path.join(root(), relativePath), { recursive: true, force: true });
  });

  test("creates, validates, and generates a Tower Defense project", async () => {
    await vscode.commands.executeCommand("robloxForge.newTowerDefenseProject");
    const definitionPath = path.join(root(), ".forge", "tower-defense.json");
    const definition = JSON.parse(await fs.readFile(definitionPath, "utf8"));
    assert.equal(definition.kind, "tower-defense");
    assert.equal(definition.messages[0].name, "PlaceTower");

    await vscode.commands.executeCommand("robloxForge.applyEdit", { kind: "setTopology", value: "lanes" });
    await vscode.commands.executeCommand("robloxForge.applyEdit", { kind: "addMessage" });
    const editedDefinition = JSON.parse(await fs.readFile(definitionPath, "utf8"));
    assert.equal(editedDefinition.topology, "lanes");
    assert.equal(editedDefinition.messages[1].name, "AbilityActivated");

    await vscode.commands.executeCommand("robloxForge.validate");
    await vscode.commands.executeCommand("robloxForge.generate");

    const [simulation, network, project] = await Promise.all([
      fs.readFile(path.join(root(), "src/shared/domain/Simulation.luau"), "utf8"),
      fs.readFile(path.join(root(), "src/shared/schemas/Network.luau"), "utf8"),
      fs.readFile(path.join(root(), "default.project.json"), "utf8")
    ]);
    assert.match(simulation, /Pure domain boundary/);
    assert.match(network, /export type PlaceTower/);
    assert.match(network, /export type AbilityActivated/);
    assert.match(await fs.readFile(path.join(root(), "src/shared/domain/TowerDefenseConfig.luau"), "utf8"), /topology = "lanes"/);
    assert.equal(JSON.parse(project).tree.ReplicatedStorage.Shared.$path, "src/shared");
  });
});
