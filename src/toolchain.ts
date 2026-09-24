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
  { label: "Lute domain tests", command: "lute", args: ["test", "tests"] }
];

/** Runs only read-only checks. Dependency installation and Rojo builds stay explicit user actions. */
export async function runToolchain(root: string): Promise<ToolResult[]> {
  return Promise.all(tools.map(async (tool) => {
    const command = `${tool.command} ${tool.args.join(" ")}`;
    try {
      const { stdout, stderr } = await exec(tool.command, tool.args, { cwd: root, timeout: 30_000, maxBuffer: 1_000_000 });
      return { label: tool.label, command, status: "passed" as const, output: `${stdout}${stderr}`.trim() };
    } catch (error: unknown) {
      const detail = error as { code?: string | number; stdout?: string; stderr?: string; message?: string };
      if (detail.code === "ENOENT") return { label: tool.label, command, status: "unavailable" as const, output: `${tool.command} is not installed or is not on PATH.` };
      return { label: tool.label, command, status: "failed" as const, output: `${detail.stdout ?? ""}${detail.stderr ?? ""}`.trim() || detail.message || "Tool failed without output." };
    }
  }));
}
