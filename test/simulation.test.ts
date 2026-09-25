import { describe, expect, it } from "vitest";
import { sampleDefinition } from "../src/model";
import { simulateTowerDefense } from "../src/simulation";

describe("Tower Defense simulation", () => {
  it("runs authored waves deterministically outside Studio", () => {
    const summary = simulateTowerDefense(sampleDefinition(), 100);
    expect(summary).toEqual({ runs: 100, wavesProcessed: 100, spawned: 1000, defeated: 1000, leaked: 0, rewards: 10_000 });
  });

  it("reports leaks when enemies outpace authored tower damage", () => {
    const definition = sampleDefinition();
    definition.towers[0].damage = 0.01;
    const summary = simulateTowerDefense(definition, 1);
    expect(summary.leaked).toBe(10);
    expect(summary.defeated).toBe(0);
  });
});
