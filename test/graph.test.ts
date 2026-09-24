import { describe, expect, it } from "vitest";
import { scheduleBlocks } from "../src/graph";
import { applyCanvasEdit, sampleDefinition } from "../src/model";
import { validateDefinition } from "../src/validation";

describe("visual execution graph", () => {
  it("schedules blocks from explicit execution edges rather than canvas order", () => {
    const definition = sampleDefinition();
    definition.connections = [{ from: "apply-damage", to: "spawn-wave" }];
    expect(scheduleBlocks(definition).map((block) => block.id).slice(0, 2)).toEqual(["move-enemies", "acquire-targets"]);
    expect(scheduleBlocks(definition).map((block) => block.id).indexOf("apply-damage")).toBeLessThan(scheduleBlocks(definition).map((block) => block.id).indexOf("spawn-wave"));
  });

  it("rejects an execution cycle", () => {
    const definition = sampleDefinition();
    definition.connections.push({ from: "cleanup-dead", to: "spawn-wave" });
    expect(validateDefinition(definition).map((item) => item.message)).toContain("The enabled simulation graph contains an execution cycle.");
  });

  it("persists typed block properties and canvas position", () => {
    const configured = applyCanvasEdit(sampleDefinition(), { kind: "setBlockConfig", value: "spawn-wave", key: "waveIncrement", amount: 3 });
    const positioned = applyCanvasEdit(configured, { kind: "setBlockPosition", value: "spawn-wave", position: { x: 700.2, y: 40.8 } });
    expect(positioned.flow[0].config.waveIncrement).toBe(3);
    expect(positioned.flow[0].position).toEqual({ x: 700, y: 41 });
  });

  it("requires a true and false execution path for condition blocks", () => {
    const definition = sampleDefinition();
    definition.flow = [{ ...definition.flow[0], id: "condition", kind: "condition", config: {}, bindings: [], stateCondition: { field: "lives", comparison: ">", amount: 0 } }, definition.flow[1], definition.flow[2]];
    definition.connections = [{ from: "condition", to: definition.flow[1].id, fromPort: "true" }];
    expect(validateDefinition(definition).map((item) => item.message)).toContain("Condition Spawn Wave needs both true and false outputs.");
  });
});
