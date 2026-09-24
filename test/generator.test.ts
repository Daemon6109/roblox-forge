import { describe, expect, it } from "vitest";
import { generateTowerDefense } from "../src/generator";
import { sampleDefinition } from "../src/model";
import { validateDefinition } from "../src/validation";

describe("Tower Defense generator", () => {
  it("emits a normal Rojo/Wally/Luau project", () => {
    const files = generateTowerDefense(sampleDefinition());
    expect(files.map((file) => file.path)).toEqual(expect.arrayContaining(["wally.toml", "default.project.json", "src/shared/domain/Simulation.luau", "src/shared/schemas/Network.luau"]));
    expect(files.find((file) => file.path === "src/shared/schemas/Network.luau")?.content).toContain("export type PlaceTower");
  });
  it("rejects invalid message names before generation", () => {
    const definition = sampleDefinition();
    definition.messages[0].name = "place tower";
    expect(validateDefinition(definition)).toHaveLength(1);
    expect(() => generateTowerDefense(definition)).toThrow("PascalCase");
  });
});
