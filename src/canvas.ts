import * as vscode from "vscode";
import type { TowerDefenseDefinition } from "./model";
import type { CanvasEdit } from "./model";
import type { Diagnostic } from "./validation";

type CanvasState = { definition?: TowerDefenseDefinition; diagnostics: Diagnostic[] };

export class ForgeCanvasProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "robloxForge.canvas";
  private view?: vscode.WebviewView;
  private state: CanvasState = { diagnostics: [] };

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.render();
    view.webview.onDidReceiveMessage(async (message: { command: string; edit?: CanvasEdit }) => {
      if (message.command === "create") await vscode.commands.executeCommand("robloxForge.newTowerDefenseProject");
      if (message.command === "validate") await vscode.commands.executeCommand("robloxForge.validate");
      if (message.command === "generate") await vscode.commands.executeCommand("robloxForge.generate");
      if (message.command === "applyEdit" && message.edit) await vscode.commands.executeCommand("robloxForge.applyEdit", message.edit);
    });
  }

  setState(definition?: TowerDefenseDefinition, diagnostics: Diagnostic[] = []) {
    this.state = { definition, diagnostics };
    if (this.view) this.view.webview.html = this.render();
  }

  private render() {
    const { definition, diagnostics } = this.state;
    const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" })[character] ?? character);
    const projectName = escapeHtml(definition?.name ?? "No Forge definition yet");
    const targetModes = definition?.targeting.join(" · ") ?? "Create a definition to begin";
    const networkNode = escapeHtml(definition?.messages.map((message) => message.name).join(" · ") || "No schemas");
    const health = !definition ? "Ready to create" : diagnostics.length ? `${diagnostics.length} validation issue${diagnostics.length === 1 ? "" : "s"}` : "Graph valid";
    const healthClass = diagnostics.length ? "bad" : "good";
    return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  :root { color-scheme: dark; font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
  body { margin: 0; background: var(--vscode-sideBar-background); }
  header { padding: 14px 16px; border-bottom: 1px solid var(--vscode-panel-border); display:flex; align-items:center; justify-content:space-between; gap:8px; }
  h1 { font-size: 13px; margin:0; letter-spacing:.02em; } .status {font-size:11px; padding:4px 7px; border-radius:999px; font-weight:600;} .good{background:#1f6f463d;color:#7ee787}.bad{background:#b623243d;color:#ff7b72}
  .toolbar { display:flex; flex-wrap:wrap; gap:6px; padding:10px 16px; } button { color:var(--vscode-button-foreground); background:var(--vscode-button-background); border:0; border-radius:4px; padding:6px 8px; cursor:pointer; font-size:11px; } button:hover{background:var(--vscode-button-hoverBackground)} button.secondary{background:var(--vscode-button-secondaryBackground)} button.selected{outline:1px solid #f3bf75} select{background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;padding:4px;font-size:10px}
  .canvas { position:relative; overflow:hidden; min-height:570px; background-image:radial-gradient(var(--vscode-editorWidget-border) 1px, transparent 1px); background-size:18px 18px; }
  svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; } .edge{stroke:#c79145;stroke-width:2;fill:none;stroke-linecap:round;opacity:.75}
  .node { position:absolute; width:150px; border:1px solid var(--vscode-editorWidget-border); background:var(--vscode-editorWidget-background); border-radius:7px; box-shadow:0 5px 14px #0005; overflow:hidden; } .node h2{font-size:11px;margin:0;padding:8px 9px;background:#c7914526;color:#f3bf75;border-bottom:1px solid var(--vscode-editorWidget-border)} .node p{font-size:10px;line-height:1.4;margin:8px 9px;color:var(--vscode-descriptionForeground)} .tag{display:inline-block;margin:0 4px 6px 9px;font-size:9px;padding:2px 4px;border-radius:3px;background:#ffffff12;color:var(--vscode-foreground)}
  .factory{left:calc(50% - 75px);top:28px}.components{left:10%;top:180px}.systems{right:10%;top:180px}.network{left:calc(50% - 75px);top:325px}.output{left:calc(50% - 75px);top:470px}.empty{padding:30px 16px;color:var(--vscode-descriptionForeground);font-size:12px}
  .footer{padding:10px 16px;border-top:1px solid var(--vscode-panel-border);font-size:11px;color:var(--vscode-descriptionForeground)}
</style></head><body>
  <header><h1>${projectName}</h1><span class="status ${healthClass}">${health}</span></header>
  <div class="toolbar"><button data-command="create">New Tower Defense</button><button data-command="validate">Validate</button><button data-command="generate">Generate Luau</button></div>
  <main class="canvas">
    ${definition ? `<svg viewBox="0 0 600 570" preserveAspectRatio="none"><path class="edge" d="M300 105 C300 150 120 135 120 180"/><path class="edge" d="M300 105 C300 150 480 135 480 180"/><path class="edge" d="M120 270 C120 310 300 285 300 325"/><path class="edge" d="M480 270 C480 310 300 285 300 325"/><path class="edge" d="M300 415 L300 470"/></svg>
    <section class="node factory"><h2>Factory · Tower Defense</h2><p>${escapeHtml(definition.topology)} topology<br>${escapeHtml(definition.economy)} economy</p><span class="tag">${escapeHtml(targetModes)}</span></section>
    <section class="node components"><h2>Simulation data</h2><p>Enemy · Tower<br>Health · Target<br>Wave · Economy</p><span class="tag">Pure domain</span></section>
    <section class="node systems"><h2>System schedule</h2><p>Spawn → Move<br>Acquire target → Attack<br>Damage → Cleanup</p><span class="tag">JECS-ready</span></section>
    <section class="node network"><h2>Network schemas</h2><p>${networkNode}</p><span class="tag">Lync boundary</span></section>
    <section class="node output"><h2>Generated project</h2><p>Luau domain · Rojo<br>Wally · test skeleton</p><span class="tag">Lute-ready</span></section>` : `<p class="empty">Create a Tower Defense definition to turn this canvas into a generated, testable project architecture.</p>`}
  </main>${definition ? `<section class="toolbar"><label>Topology <select data-edit="setTopology">${["spline", "graph", "lanes"].map((value) => `<option value="${value}"${definition.topology === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Economy <select data-edit="setEconomy">${["shared", "per-player"].map((value) => `<option value="${value}"${definition.economy === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><span>Targeting</span>${["first", "last", "strongest", "weakest", "nearest"].map((value) => `<button class="secondary ${definition.targeting.includes(value as TowerDefenseDefinition["targeting"][number]) ? "selected" : ""}" data-target="${value}">${value}</button>`).join("")}<button class="secondary" data-add-message>Add schema</button>${definition.messages.map((message) => `<button class="secondary" data-remove-message="${escapeHtml(message.name)}">× ${escapeHtml(message.name)}</button>`).join("")}</section>` : ""}<footer class="footer">Visual definitions are source. Generated Luau remains version-controllable and editable.</footer>
  <script>const vscode = acquireVsCodeApi(); const send = (edit) => vscode.postMessage({command:"applyEdit",edit}); document.querySelectorAll('button[data-command]').forEach((button) => button.addEventListener('click', () => vscode.postMessage({command:button.dataset.command}))); document.querySelectorAll('select[data-edit]').forEach((select) => select.addEventListener('change', () => send({kind:select.dataset.edit,value:select.value}))); document.querySelectorAll('button[data-target]').forEach((button) => button.addEventListener('click', () => send({kind:"toggleTargeting",value:button.dataset.target}))); document.querySelector('[data-add-message]')?.addEventListener('click', () => send({kind:"addMessage"})); document.querySelectorAll('[data-remove-message]').forEach((button) => button.addEventListener('click', () => send({kind:"removeMessage",value:button.dataset.removeMessage})));</script>
</body></html>`;
  }
}
