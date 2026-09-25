import { describe, expect, it } from "vitest";
import { generateTowerDefense } from "../src/generator";
import { sampleDefinition } from "../src/model";
import { validateDefinition } from "../src/validation";

describe("Tower Defense generator", () => {
  it("emits a normal Rojo/Wally/Luau project", () => {
    const files = generateTowerDefense(sampleDefinition());
    expect(files.map((file) => file.path)).toEqual(expect.arrayContaining(["rokit.toml", "wally.toml", "default.project.json", "src/shared/domain/Simulation.luau", "src/shared/schemas/Network.luau"]));
    expect(files.find((file) => file.path === "rokit.toml")?.content).toContain("luau-lang/lute@1.0.0");
    expect(files.find((file) => file.path === "src/shared/domain/TowerDefenseConfig.luau")?.content).toContain("minimumSeparation = 4");
    expect(files.find((file) => file.path === "src/shared/schemas/Network.luau")?.content).toContain("export type PlaceTower");
    expect(files.find((file) => file.path === "src/shared/schemas/GameSchema.luau")?.content).toContain("export type Health");
    expect(files.find((file) => file.path === "src/shared/domain/Simulation.luau")?.content).toContain("Health: GameSchema.Health?");
    expect(files.find((file) => file.path === "tests/domain/Simulation.spec.luau")?.content).toContain("Lives never become negative");
  });
  it("rejects invalid message names before generation", () => {
    const definition = sampleDefinition();
    definition.messages[0].name = "place tower";
    expect(validateDefinition(definition)).toHaveLength(1);
    expect(() => generateTowerDefense(definition)).toThrow("PascalCase");
  });

  it("generates Wally package sections from visual package declarations", () => {
    const definition = sampleDefinition();
    definition.packages = [
      { id: "shared-package", alias: "Jecs", spec: "ukendio/jecs@0.5.0", realm: "shared" },
      { id: "server-package", alias: "Lyra", spec: "paradoxum-games/lyra@0.1.0", realm: "server" }
    ];
    const manifest = generateTowerDefense(definition).find((file) => file.path === "wally.toml")?.content ?? "";
    expect(manifest).toContain('[dependencies]');
    expect(manifest).toContain('Jecs = "ukendio/jecs@0.5.0"');
    expect(manifest).toContain('[server-dependencies]');
    expect(manifest).toContain('Lyra = "paradoxum-games/lyra@0.1.0"');
  });

  it("generates a reusable routine called by a graph block", () => {
    const definition = sampleDefinition();
    definition.routines = [{ id: "routine-award", name: "AwardBonus", steps: [{ field: "currency", operation: "add", amount: 25, operand: { source: "literal", amount: 25 } }] }];
    definition.flow = [{ ...definition.flow[0], id: "run-award", kind: "callRoutine", label: "Award bonus", config: {}, bindings: [], routineId: "routine-award" }];
    definition.connections = [];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain("local function runAwardBonus");
    expect(simulation).toContain("return runAwardBonus(state, context)");
    expect(simulation).toContain("state.currency + 25");
  });

  it("generates authored tower, enemy, and wave data", () => {
    const files = generateTowerDefense(sampleDefinition());
    expect(files.find((file) => file.path === "src/shared/domain/TowerCatalog.luau")?.content).toContain("Archer");
    expect(files.find((file) => file.path === "src/shared/domain/EnemyCatalog.luau")?.content).toContain("Grunt");
    expect(files.find((file) => file.path === "src/shared/domain/WaveSchedule.luau")?.content).toContain('enemyId = "grunt"');
    expect(files.find((file) => file.path === "src/shared/domain/TowerDefenseSimulator.luau")?.content).toContain("function Simulator.simulate");
    expect(files.find((file) => file.path === "src/shared/domain/Targeting.luau")?.content).toContain("function Targeting.select");
    expect(files.find((file) => file.path === "src/shared/domain/Placement.luau")?.content).toContain("function Placement.isAvailable");
    expect(files.find((file) => file.path === "src/shared/domain/Combat.luau")?.content).toContain("function Combat.applyDamage");
    expect(files.find((file) => file.path === "tests/domain/Simulation.spec.luau")?.content).toContain("simulates authored waves without Studio");
    expect(files.find((file) => file.path === "tests/domain/Simulation.spec.luau")?.content).toContain("rejects overlapping tower placement");
    expect(files.find((file) => file.path === "tests/domain/Simulation.spec.luau")?.content).toContain("Authored waves do not leak");
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

  it("turns a state mutation block into concrete Luau", () => {
    const definition = sampleDefinition();
    definition.flow = [{ ...definition.flow[0], id: "award-coins", kind: "mutateState", label: "Award coins", config: {}, bindings: [], stateMutation: { field: "currency", operation: "add", amount: 50 } }];
    definition.connections = [];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain("state.currency + 50");
    expect(simulation).toContain("Visual state mutation: add 50 to currency");
  });

  it("uses a state value as a visual arithmetic operand", () => {
    const definition = sampleDefinition();
    definition.flow = [{ ...definition.flow[0], id: "convert-wave", kind: "mutateState", label: "Convert wave", config: {}, bindings: [], stateMutation: { field: "currency", operation: "add", amount: 0, operand: { source: "state", field: "wave" } } }];
    definition.connections = [];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain("state.currency + state.wave");
  });

  it("generates extended visual arithmetic operations", () => {
    const definition = sampleDefinition();
    definition.flow = [{ ...definition.flow[0], id: "double-wave", kind: "mutateState", label: "Double wave", config: {}, bindings: [], stateMutation: { field: "wave", operation: "multiply", amount: 2 } }];
    definition.connections = [];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain("state.wave * 2");
  });

  it("generates separate true and false control flow for a condition", () => {
    const definition = sampleDefinition();
    const condition = { ...definition.flow[0], id: "still-alive", kind: "condition" as const, label: "Still alive", config: {}, bindings: [], stateCondition: { field: "lives" as const, comparison: ">" as const, amount: 0 } };
    const onTrue = { ...definition.flow[1], id: "award", kind: "mutateState" as const, label: "Award", config: {}, bindings: [], stateMutation: { field: "currency" as const, operation: "add" as const, amount: 10 } };
    const onFalse = { ...definition.flow[2], id: "end", kind: "mutateState" as const, label: "End", config: {}, bindings: [], stateMutation: { field: "lives" as const, operation: "set" as const, amount: 0 } };
    definition.flow = [condition, onTrue, onFalse];
    definition.connections = [{ from: "still-alive", to: "award", fromPort: "true" }, { from: "still-alive", to: "end", fromPort: "false" }];
    const simulation = generateTowerDefense(definition).find((file) => file.path === "src/shared/domain/Simulation.luau")?.content ?? "";
    expect(simulation).toContain('return state.lives > 0 and "true" or "false"');
    expect(simulation).toContain('state = runFrom("still-alive", state, context)');
  });
});
