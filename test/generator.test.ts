import { describe, expect, it } from "vitest";
import { generateTowerDefense } from "../src/generator";
import { sampleDefinition } from "../src/model";
import { validateDefinition } from "../src/validation";

describe("Tower Defense generator", () => {
  it("emits a normal Rojo/Wally/Luau project", () => {
    const files = generateTowerDefense(sampleDefinition());
    expect(files.map((file) => file.path)).toEqual(expect.arrayContaining(["wally.toml", "default.project.json", "src/shared/domain/Simulation.luau", "src/shared/schemas/Network.luau"]));
    expect(files.find((file) => file.path === "src/shared/schemas/Network.luau")?.content).toContain("export type PlaceTower");
    expect(files.find((file) => file.path === "src/shared/schemas/GameSchema.luau")?.content).toContain("export type Health");
    expect(files.find((file) => file.path === "src/shared/domain/Simulation.luau")?.content).toContain("Health: GameSchema.Health?");
  });
  it("rejects invalid message names before generation", () => {
    const definition = sampleDefinition();
    definition.messages[0].name = "place tower";
    expect(validateDefinition(definition)).toHaveLength(1);
    expect(() => generateTowerDefense(definition)).toThrow("PascalCase");
  });

  it("turns enabled visual blocks into a concrete Luau execution pipeline", () => {
    const definition = sampleDefinition();
    definition.flow = [{ ...definition.flow[0], enabled: true }, { ...definition.flow[5], enabled: false }];
    definition.connections = [];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain("local function spawnWave");
    expect(simulation).toContain("state = spawnWave(state, context)");
    expect(simulation).not.toContain("local function cleanupDead");
  });

  it("emits a custom system block as editable Luau in the scheduled graph", () => {
    const definition = sampleDefinition();
    const custom = { ...definition.flow[0], id: "customSystem-1", kind: "customSystem" as const, label: "Grant Bonus", config: {}, bindings: ["health"], code: "\treturn state" };
    definition.flow = [custom];
    definition.connections = [];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain("Custom System block (customSystem-1)");
    expect(simulation).toContain('id="customSystem-1"');
  });
});
