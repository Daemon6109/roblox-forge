import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { generateTowerDefense } from "./generator";
import { ForgeCanvasProvider } from "./canvas";
import { applyCanvasEdit, hydrateDefinition, sampleDefinition, type CanvasEdit, type TowerDefenseDefinition } from "./model";
import { validateDefinition } from "./validation";
import { preserveUserRegions } from "./ownership";
import { installWallyDependencies, runToolchain } from "./toolchain";
import { ForgeExplorerProvider } from "./explorer";

const definitionPath = (root: string) => path.join(root, ".forge", "tower-defense.json");

async function workspaceRoot(): Promise<string | undefined> {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
async function readDefinition(root: string): Promise<TowerDefenseDefinition> {
  return hydrateDefinition(JSON.parse(await fs.readFile(definitionPath(root), "utf8")) as TowerDefenseDefinition);
}
async function saveDefinition(root: string, definition: TowerDefenseDefinition) {
  await fs.mkdir(path.dirname(definitionPath(root)), { recursive: true });
  await fs.writeFile(definitionPath(root), JSON.stringify(definition, null, 2) + "\n", "utf8");
}
async function writeFiles(root: string, files: ReturnType<typeof generateTowerDefense>) {
  await Promise.all(files.map(async (file) => {
    const destination = path.join(root, file.path);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    let existing: string | undefined;
    try { existing = await fs.readFile(destination, "utf8"); } catch { /* first generation */ }
    const content = file.path.endsWith(".luau") ? preserveUserRegions(file.content, existing) : file.content;
    await fs.writeFile(destination, content, "utf8");
  }));
}

export function activate(context: vscode.ExtensionContext) {
  const canvas = new ForgeCanvasProvider();
  const explorer = new ForgeExplorerProvider();
  const toolOutput = vscode.window.createOutputChannel("Roblox Forge · Build & Test");
  const undoStack: TowerDefenseDefinition[] = [];
  const redoStack: TowerDefenseDefinition[] = [];
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(ForgeCanvasProvider.viewType, canvas));
  context.subscriptions.push(vscode.window.registerTreeDataProvider("robloxForge.explorer", explorer));
  context.subscriptions.push(toolOutput);
  const refreshCanvas = async () => {
    const root = await workspaceRoot();
    if (!root) { canvas.setState(); explorer.setProject(undefined, undefined); return; }
    try {
      const definition = await readDefinition(root);
      canvas.setState(definition, validateDefinition(definition));
      explorer.setProject(root, definition);
    } catch { canvas.setState(); explorer.setProject(root, undefined); }
  };
  void refreshCanvas();
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.commandPalette", async () => {
    const choice = await vscode.window.showQuickPick([
      { label: "Create Tower Defense Definition", command: "robloxForge.newTowerDefenseProject" },
      { label: "Validate Graph", command: "robloxForge.validate" },
      { label: "Build & Test", command: "robloxForge.buildAndTest" },
      { label: "Install Wally Dependencies", command: "robloxForge.installDependencies" },
      { label: "Generate Luau Project", command: "robloxForge.generate" },
      { label: "Open Generated Simulation", command: "robloxForge.openGeneratedSimulation" },
      { label: "Add Visual Block…", command: "addBlock" }
    ], { title: "Roblox Forge", placeHolder: "What do you want to do?" });
    if (!choice) return;
    if (choice.command === "addBlock") {
      const kind = await vscode.window.showQuickPick([
        { label: "Spawn Wave", value: "spawnWave" }, { label: "Move Enemies", value: "moveEnemies" }, { label: "Acquire Targets", value: "acquireTargets" }, { label: "Attack Targets", value: "attackTargets" }, { label: "Apply Damage", value: "applyDamage" }, { label: "Cleanup Dead", value: "cleanupDead" }, { label: "Modify Game State", value: "mutateState" }, { label: "If Game State", value: "condition" }, { label: "Custom Luau System", value: "customSystem" }
      ], { title: "Add visual block" });
      if (kind) await vscode.commands.executeCommand("robloxForge.applyEdit", { kind: "addBlock", value: kind.value });
      return;
    }
    await vscode.commands.executeCommand(choice.command);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.newProject", async () => {
    const parent = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: "Choose project location" });
    if (!parent?.[0]) return;
    const name = await vscode.window.showInputBox({ prompt: "Project name", placeHolder: "My Tower Defense", validateInput: (value) => value.trim() ? undefined : "A project name is required." });
    if (!name) return;
    const destination = path.join(parent[0].fsPath, name.replace(/[\\/:*?"<>|]/g, "-").trim());
    try {
      const definition = { ...sampleDefinition(), name };
      await fs.mkdir(destination, { recursive: false });
      await saveDefinition(destination, definition);
      await writeFiles(destination, generateTowerDefense(definition));
      await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(destination), true);
    } catch (error) { vscode.window.showErrorMessage(`Could not create Forge project: ${String(error)}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.newTowerDefenseProject", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder before creating a Forge definition.");
    await saveDefinition(root, sampleDefinition());
    await refreshCanvas();
    await vscode.window.showTextDocument(vscode.Uri.file(definitionPath(root)));
    vscode.window.showInformationMessage("Tower Defense definition created. Run Generate Luau Project when ready.");
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.applyEdit", async (edit: CanvasEdit) => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder first.");
    try {
      const current = await readDefinition(root);
      const next = applyCanvasEdit(current, edit);
      undoStack.push(structuredClone(current));
      redoStack.length = 0;
      await saveDefinition(root, next);
      canvas.setState(next, validateDefinition(next));
      explorer.setProject(root, next);
    } catch (error) { vscode.window.showErrorMessage(`Forge edit failed: ${String(error)}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.undo", async () => {
    const root = await workspaceRoot();
    const previous = undoStack.pop();
    if (!root || !previous) return;
    const current = await readDefinition(root);
    redoStack.push(structuredClone(current));
    await saveDefinition(root, previous);
    canvas.setState(previous, validateDefinition(previous));
    explorer.setProject(root, previous);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.redo", async () => {
    const root = await workspaceRoot();
    const next = redoStack.pop();
    if (!root || !next) return;
    const current = await readDefinition(root);
    undoStack.push(structuredClone(current));
    await saveDefinition(root, next);
    canvas.setState(next, validateDefinition(next));
    explorer.setProject(root, next);
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.validate", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder first.");
    try {
      const diagnostics = validateDefinition(await readDefinition(root));
      canvas.setState(await readDefinition(root), diagnostics);
      if (diagnostics.length) vscode.window.showErrorMessage(`Forge validation failed: ${diagnostics.map((item) => item.message).join(" ")}`);
      else vscode.window.showInformationMessage("Forge validation passed.");
    } catch (error) { vscode.window.showErrorMessage(`Could not read visual definition: ${String(error)}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.generate", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder first.");
    try {
      await writeFiles(root, generateTowerDefense(await readDefinition(root)));
      await refreshCanvas();
      vscode.window.showInformationMessage("Generated Luau domain, network schemas, Rojo project, Wally manifest, and domain test.");
    } catch (error) { vscode.window.showErrorMessage(`Forge generation failed: ${String(error)}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.buildAndTest", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a Forge project first.");
    try {
      const definition = await readDefinition(root);
      const diagnostics = validateDefinition(definition);
      if (diagnostics.length) {
        canvas.setState(definition, diagnostics);
        return vscode.window.showErrorMessage(`Build & Test stopped: ${diagnostics.map((item) => item.message).join(" ")}`);
      }
      await writeFiles(root, generateTowerDefense(definition));
      const results = await runToolchain(root);
      toolOutput.clear();
      toolOutput.appendLine("Roblox Forge Build & Test");
      toolOutput.appendLine("✓ Graph valid");
      toolOutput.appendLine("✓ Code generated");
      for (const result of results) {
        const icon = result.status === "passed" ? "✓" : result.status === "unavailable" ? "–" : "✗";
        toolOutput.appendLine(`${icon} ${result.label} — ${result.status}`);
        toolOutput.appendLine(`  ${result.command}`);
        if (result.output) toolOutput.appendLine(`  ${result.output.replace(/\n/g, "\n  ")}`);
      }
      toolOutput.show(true);
      const failures = results.filter((result) => result.status === "failed");
      const unavailable = results.filter((result) => result.status === "unavailable");
      if (failures.length) vscode.window.showErrorMessage(`Build & Test: ${failures.length} check${failures.length === 1 ? "" : "s"} failed. See Roblox Forge · Build & Test.`);
      else if (unavailable.length) vscode.window.showWarningMessage(`Graph and generation passed. ${unavailable.length} local tool${unavailable.length === 1 ? " is" : "s are"} unavailable; see Build & Test output.`);
      else vscode.window.showInformationMessage("Build & Test passed.");
    } catch (error) { vscode.window.showErrorMessage(`Build & Test failed: ${String(error)}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.installDependencies", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a Forge project first.");
    const result = await installWallyDependencies(root);
    toolOutput.clear();
    toolOutput.appendLine(`${result.status === "passed" ? "✓" : result.status === "unavailable" ? "–" : "✗"} ${result.label}`);
    toolOutput.appendLine(result.command);
    if (result.output) toolOutput.appendLine(result.output);
    toolOutput.show(true);
    if (result.status === "passed") vscode.window.showInformationMessage("Wally dependencies installed and lockfile updated.");
    else if (result.status === "unavailable") vscode.window.showWarningMessage("Wally is not installed; see Roblox Forge · Build & Test.");
    else vscode.window.showErrorMessage("Wally dependency install failed; see Roblox Forge · Build & Test.");
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.openGeneratedSimulation", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a Forge project first.");
    try { await vscode.window.showTextDocument(vscode.Uri.file(path.join(root, "src/shared/domain/Simulation.luau"))); }
    catch { vscode.window.showErrorMessage("Generate the project before opening its simulation."); }
  }));
}

export function deactivate() {}
