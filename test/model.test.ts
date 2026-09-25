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

  it("edits a network contract atomically with typed fields", () => {
    const updated = applyCanvasEdit(sampleDefinition(), {
      kind: "updateMessage",
      value: "PlaceTower",
      message: {
        name: "AbilityActivated",
        direction: "serverToClient",
        fields: [{ name: "abilityId", type: "u16" }, { name: "accepted", type: "boolean" }]
      }
    });
    expect(updated.messages).toEqual([{ name: "AbilityActivated", direction: "serverToClient", fields: [{ name: "abilityId", type: "u16" }, { name: "accepted", type: "boolean" }] }]);
  });

  it("adds and edits generated visual invariant tests", () => {
    const withTest = applyCanvasEdit(sampleDefinition(), { kind: "addTest" });
    const test = withTest.tests.at(-1)!;
    const updated = applyCanvasEdit(withTest, { kind: "updateTest", value: test.id, test: { id: test.id, name: "Currency stays positive", condition: { field: "currency", comparison: ">=", amount: 0 } } });
    expect(updated.tests.at(-1)).toMatchObject({ name: "Currency stays positive", condition: { field: "currency", comparison: ">=", amount: 0 } });
  });

  it("declares a Wally package in an explicit realm", () => {
    const withPackage = applyCanvasEdit(sampleDefinition(), { kind: "addPackage" });
    const item = withPackage.packages[0];
    const updated = applyCanvasEdit(withPackage, { kind: "updatePackage", value: item.id, package: { ...item, alias: "Jecs", spec: "ukendio/jecs@0.5.0", realm: "server" } });
    expect(updated.packages).toEqual([{ id: item.id, alias: "Jecs", spec: "ukendio/jecs@0.5.0", realm: "server" }]);
  });

  it("creates reusable visual routines and assigns them to call blocks", () => {
    const withRoutine = applyCanvasEdit(sampleDefinition(), { kind: "addRoutine" });
    const routine = withRoutine.routines[0];
    const withCall = applyCanvasEdit(withRoutine, { kind: "addBlock", value: "callRoutine" });
    const call = withCall.flow.at(-1)!;
    const updated = applyCanvasEdit(withCall, { kind: "setBlockRoutine", value: call.id, routineId: routine.id });
    expect(updated.flow.at(-1)).toMatchObject({ kind: "callRoutine", routineId: routine.id });
  });

  it("authors Tower Defense catalogs and wave entries", () => {
    const withTower = applyCanvasEdit(sampleDefinition(), { kind: "addTower" });
    const tower = withTower.towers.at(-1)!;
    const updatedTower = applyCanvasEdit(withTower, { kind: "updateTower", value: tower.id, tower: { ...tower, name: "Cannon", damage: 30 } });
    const withWave = applyCanvasEdit(updatedTower, { kind: "addWave" });
    expect(withWave.towers.at(-1)).toMatchObject({ name: "Cannon", damage: 30 });
    expect(withWave.waves.at(-1)).toMatchObject({ enemyId: "grunt", count: 10 });
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

  it("binds a system to a visual data contract", () => {
    const updated = applyCanvasEdit(sampleDefinition(), { kind: "toggleBlockBinding", value: "spawn-wave", schemaId: "health" });
    expect(updated.flow.find((block) => block.id === "spawn-wave")?.bindings).toEqual(expect.arrayContaining(["health", "game-state"]));
  });

  it("removes stale bindings when a visual contract is removed", () => {
    const updated = applyCanvasEdit(sampleDefinition(), { kind: "removeSchema", value: "health" });
    expect(updated.flow.every((block) => !block.bindings.includes("health"))).toBe(true);
  });

  it("edits typed schema fields with safe identifiers", () => {
    const renamed = applyCanvasEdit(sampleDefinition(), { kind: "setSchemaFieldName", value: "health", fieldIndex: 0, name: "hitPoints" });
    const updated = applyCanvasEdit(renamed, { kind: "setSchemaFieldType", value: "health", fieldIndex: 0, fieldType: "u16" });
    expect(updated.schemas.find((schema) => schema.id === "health")?.fields[0]).toEqual({ name: "hitPoints", type: "u16" });
  });

  it("creates an executable state mutation block", () => {
    const withBlock = applyCanvasEdit(sampleDefinition(), { kind: "addBlock", value: "mutateState" });
    const block = withBlock.flow.at(-1)!;
    const updated = applyCanvasEdit(withBlock, { kind: "setStateMutation", value: block.id, mutation: { field: "currency", operation: "add", amount: 50 } });
    expect(updated.flow.at(-1)?.stateMutation).toMatchObject({ field: "currency", operation: "add", amount: 50 });
  });

  it("creates a visual state condition with separate true and false ports", () => {
    const withBlock = applyCanvasEdit(sampleDefinition(), { kind: "addBlock", value: "condition" });
    const condition = withBlock.flow.at(-1)!;
    const updated = applyCanvasEdit(withBlock, { kind: "setStateCondition", value: condition.id, condition: { field: "lives", comparison: ">", amount: 0 } });
    expect(updated.flow.at(-1)?.stateCondition).toEqual({ field: "lives", comparison: ">", amount: 0 });
  });
});
