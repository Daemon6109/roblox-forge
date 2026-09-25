import type { TowerDefenseDefinition } from "./model";

export type SimulationSummary = {
  runs: number;
  wavesProcessed: number;
  spawned: number;
  defeated: number;
  leaked: number;
  rewards: number;
};

/** Mirrors the generated pure-Luau simulator so Forge can give immediate local feedback. */
export function simulateTowerDefense(definition: TowerDefenseDefinition, runs: number): SimulationSummary {
  if (!Number.isInteger(runs) || runs < 1 || runs > 100_000) throw new Error("Simulation runs must be an integer between 1 and 100,000.");
  const enemies = new Map(definition.enemies.map((enemy) => [enemy.id, enemy]));
  const damagePerSecond = definition.towers.reduce((total, tower) => total + tower.damage / tower.cooldown, 0);
  if (!Number.isFinite(damagePerSecond) || damagePerSecond <= 0) throw new Error("Add at least one tower with positive damage and cooldown before simulating.");
  const summary: SimulationSummary = { runs, wavesProcessed: 0, spawned: 0, defeated: 0, leaked: 0, rewards: 0 };
  for (let run = 0; run < runs; run++) {
    for (const wave of definition.waves) {
      const enemy = enemies.get(wave.enemyId);
      if (!enemy) throw new Error(`Wave ${wave.wave} references a missing enemy.`);
      summary.wavesProcessed++;
      summary.spawned += wave.count;
      if (enemy.health / damagePerSecond <= 100 / enemy.speed) {
        summary.defeated += wave.count;
        summary.rewards += wave.count * enemy.reward;
      } else summary.leaked += wave.count;
    }
  }
  return summary;
}
