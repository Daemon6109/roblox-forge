import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { generateTowerDefense } from "../src/generator";
import { sampleDefinition } from "../src/model";

const exec = promisify(execFile);
const roots: string[] = [];
const enabled = process.env.RUN_FORGE_LUTE_INTEGRATION === "1";

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("generated portable Luau", () => {
  it.skipIf(!enabled)("typechecks pure generated domain modules with pinned Lute", async () => {
    const root = await mkdtemp(join(tmpdir(), "roblox-forge-lute-"));
    roots.push(root);
    for (const file of generateTowerDefense(sampleDefinition())) {
      const destination = join(root, file.path);
      await mkdir(join(destination, ".."), { recursive: true });
      await writeFile(destination, file.content, "utf8");
    }

    await exec("rokit", ["install"], { cwd: root, timeout: 120_000 });
    const modules = ["Targeting", "Placement", "Combat", "PathProgress", "StatusEffects", "Cooldowns", "Projectiles", "Upgrades", "ProceduralWaves"].map((name) => `src/shared/domain/${name}.luau`);
    const { stdout, stderr } = await exec("lute", ["check", ...modules], { cwd: root, timeout: 60_000 });
    expect(`${stdout}${stderr}`).not.toMatch(/error/i);
  }, 180_000);
});
