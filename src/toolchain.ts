import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export type ToolStatus = "passed" | "failed" | "unavailable";
export type ToolResult = { label: string; command: string; status: ToolStatus; output: string };

type ToolInvocation = { label: string; command: string; args: string[] };

const tools: ToolInvocation[] = [
  { label: "StyLua formatting", command: "stylua", args: ["--check", "src", "tests"] },
  { label: "Selene static analysis", command: "selene", args: ["src", "tests"] },
  { label: "Lute type check", command: "lute", args: ["check", "src", "tests"] },
  { label: "Lute domain tests", command: "lute", args: ["test", "tests"] },
  { label: "Rojo project build", command: "rojo", args: ["build", "default.project.json", "--output", ".forge/build.rbxlx"] }
];

/** Runs safe checks plus a generated Rojo artifact under .forge/. Dependency installation stays explicit. */
export async function runToolchain(root: string): Promise<ToolResult[]> {
  return Promise.all(tools.map((tool) => runTool(root, tool)));
}

export function installWallyDependencies(root: string): Promise<ToolResult> {
  return runTool(root, { label: "Wally dependency install", command: "wally", args: ["install"] });
}

async function runTool(root: string, tool: ToolInvocation): Promise<ToolResult> {
  const command = `${tool.command} ${tool.args.join(" ")}`;
  try {
    const { stdout, stderr } = await exec(tool.command, tool.args, { cwd: root, timeout: 60_000, maxBuffer: 1_000_000 });
    return { label: tool.label, command, status: "passed", output: `${stdout}${stderr}`.trim() };
  } catch (error: unknown) {
    const detail = error as { code?: string | number; stdout?: string; stderr?: string; message?: string };
    if (detail.code === "ENOENT") return { label: tool.label, command, status: "unavailable", output: `${tool.command} is not installed or is not on PATH.` };
    return { label: tool.label, command, status: "failed", output: `${detail.stdout ?? ""}${detail.stderr ?? ""}`.trim() || detail.message || "Tool failed without output." };
  }
}
