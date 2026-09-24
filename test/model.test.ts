import { describe, expect, it } from "vitest";
import { applyCanvasEdit, sampleDefinition } from "../src/model";

describe("visual definition edits", () => {
  it("persists only supported topology and targeting changes", () => {
    const lanes = applyCanvasEdit(sampleDefinition(), { kind: "setTopology", value: "lanes" });
    const updated = applyCanvasEdit(lanes, { kind: "toggleTargeting", value: "last" });
    expect(updated.topology).toBe("lanes");
    expect(updated.targeting).toContain("last");
  });

  it("adds a unique network schema without mutating the source", () => {
    const source = sampleDefinition();
    const updated = applyCanvasEdit(source, { kind: "addMessage" });
    expect(source.messages).toHaveLength(1);
    expect(updated.messages.map((message) => message.name)).toEqual(["PlaceTower", "AbilityActivated"]);
  });

  it("stores custom Luau only on a Custom System block", () => {
    const withBlock = applyCanvasEdit(sampleDefinition(), { kind: "addBlock", value: "customSystem" });
    const custom = withBlock.flow.at(-1)!;
    const updated = applyCanvasEdit(withBlock, { kind: "setBlockCode", value: custom.id, code: "\treturn state" });
    expect(updated.flow.at(-1)?.code).toBe("\treturn state");
  });

  it("adds a reusable visual component schema", () => {
    const updated = applyCanvasEdit(sampleDefinition(), { kind: "addSchema", schemaKind: "component" });
    expect(updated.schemas.at(-1)).toMatchObject({ kind: "component", name: "Component2" });
  });
});
