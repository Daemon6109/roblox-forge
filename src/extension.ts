import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { generateTowerDefense } from "./generator";
import { ForgeCanvasProvider } from "./canvas";
import { applyCanvasEdit, sampleDefinition, type CanvasEdit, type TowerDefenseDefinition } from "./model";
import { validateDefinition } from "./validation";
import { preserveUserRegions } from "./ownership";

const definitionPath = (root: string) => path.join(root, ".forge", "tower-defense.json");

async function workspaceRoot(): Promise<string | undefined> {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
async function readDefinition(root: string): Promise<TowerDefenseDefinition> {
  return JSON.parse(await fs.readFile(definitionPath(root), "utf8")) as TowerDefenseDefinition;
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
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(ForgeCanvasProvider.viewType, canvas));
  const refreshCanvas = async () => {
    const root = await workspaceRoot();
    if (!root) return canvas.setState();
    try {
      const definition = await readDefinition(root);
      canvas.setState(definition, validateDefinition(definition));
    } catch { canvas.setState(); }
  };
  void refreshCanvas();
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
      const next = applyCanvasEdit(await readDefinition(root), edit);
      await saveDefinition(root, next);
      canvas.setState(next, validateDefinition(next));
    } catch (error) { vscode.window.showErrorMessage(`Forge edit failed: ${String(error)}`); }
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
}

export function deactivate() {}
