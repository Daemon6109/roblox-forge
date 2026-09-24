import * as path from "node:path";
import * as vscode from "vscode";
import type { TowerDefenseDefinition } from "./model";

type Node = { label: string; description?: string; file?: string; children?: Node[] };

export class ForgeExplorerProvider implements vscode.TreeDataProvider<Node> {
  private readonly change = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.change.event;
  private definition?: TowerDefenseDefinition;
  private root?: string;

  setProject(root: string | undefined, definition: TowerDefenseDefinition | undefined) {
    this.root = root;
    this.definition = definition;
    this.change.fire(undefined);
  }

  getTreeItem(node: Node) {
    const item = new vscode.TreeItem(node.label, node.children?.length ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    item.description = node.description;
    if (node.file && this.root) item.command = { command: "vscode.open", title: "Open", arguments: [vscode.Uri.file(path.join(this.root, node.file))] };
    return item;
  }

  getChildren(node?: Node): Node[] {
    if (node) return node.children ?? [];
    if (!this.definition) return [{ label: "Create or open a Forge project", description: "No .forge/tower-defense.json" }];
    const definition = this.definition;
    return [
      { label: "Factories", children: [{ label: definition.name, description: "Tower Defense", file: ".forge/tower-defense.json" }] },
      { label: "Systems", children: definition.flow.map((block) => ({ label: block.label, description: block.kind })) },
      { label: "Data", children: definition.schemas.map((schema) => ({ label: schema.name, description: `${schema.kind} · ${schema.fields.length} fields`, file: ".forge/tower-defense.json" })) },
      { label: "Networking", children: definition.messages.map((message) => ({ label: message.name, description: message.direction, file: ".forge/tower-defense.json" })) },
      { label: "Generated", children: [{ label: "Simulation", file: "src/shared/domain/Simulation.luau" }, { label: "Game schema", file: "src/shared/schemas/GameSchema.luau" }, { label: "Network schema", file: "src/shared/schemas/Network.luau" }, { label: "Domain tests", file: "tests/domain/Simulation.spec.luau" }] }
    ];
  }
}
