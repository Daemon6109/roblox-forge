import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { generateTowerDefense } from "./generator";
import { sampleDefinition, type TowerDefenseDefinition } from "./model";
import { validateDefinition } from "./validation";

const definitionPath = (root: string) => path.join(root, ".forge", "tower-defense.json");

async function workspaceRoot(): Promise<string | undefined> {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
async function readDefinition(root: string): Promise<TowerDefenseDefinition> {
  return JSON.parse(await fs.readFile(definitionPath(root), "utf8")) as TowerDefenseDefinition;
}
async function writeFiles(root: string, files: ReturnType<typeof generateTowerDefense>) {
  await Promise.all(files.map(async (file) => {
    const destination = path.join(root, file.path);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.content, "utf8");
  }));
}

class ForgeStatusProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem) { return element; }
  getChildren(): vscode.TreeItem[] {
    return ["Visual definitions are diffable", "Generated code is normal Luau", "Domain layer is Lute-ready"].map((label) => new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None));
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.window.registerTreeDataProvider("robloxForge.status", new ForgeStatusProvider()));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.newTowerDefenseProject", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder before creating a Forge definition.");
    await fs.mkdir(path.dirname(definitionPath(root)), { recursive: true });
    await fs.writeFile(definitionPath(root), JSON.stringify(sampleDefinition(), null, 2) + "\n", "utf8");
    await vscode.window.showTextDocument(vscode.Uri.file(definitionPath(root)));
    vscode.window.showInformationMessage("Tower Defense definition created. Run Generate Luau Project when ready.");
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.validate", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder first.");
    try {
      const diagnostics = validateDefinition(await readDefinition(root));
      if (diagnostics.length) vscode.window.showErrorMessage(`Forge validation failed: ${diagnostics.map((item) => item.message).join(" ")}`);
      else vscode.window.showInformationMessage("Forge validation passed.");
    } catch (error) { vscode.window.showErrorMessage(`Could not read visual definition: ${String(error)}`); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("robloxForge.generate", async () => {
    const root = await workspaceRoot();
    if (!root) return vscode.window.showErrorMessage("Open a folder first.");
    try {
      await writeFiles(root, generateTowerDefense(await readDefinition(root)));
      vscode.window.showInformationMessage("Generated Luau domain, network schemas, Rojo project, Wally manifest, and domain test.");
    } catch (error) { vscode.window.showErrorMessage(`Forge generation failed: ${String(error)}`); }
  }));
}

export function deactivate() {}
