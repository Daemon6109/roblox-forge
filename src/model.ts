export type Field = { name: string; type: "string" | "number" | "boolean" | "Vector3" | "u16" };

export type NetworkMessage = {
  name: string;
  direction: "clientToServer" | "serverToClient";
  fields: Field[];
};

export type SimulationBlockKind = "spawnWave" | "moveEnemies" | "acquireTargets" | "attackTargets" | "applyDamage" | "cleanupDead";
export type SimulationBlock = { id: string; kind: SimulationBlockKind; enabled: boolean };

export type TowerDefenseDefinition = {
  version: 1;
  kind: "tower-defense";
  name: string;
  topology: "spline" | "graph" | "lanes";
  economy: "shared" | "per-player";
  targeting: Array<"first" | "last" | "strongest" | "weakest" | "nearest">;
  messages: NetworkMessage[];
  flow: SimulationBlock[];
};

export type CanvasEdit =
  | { kind: "setTopology"; value: TowerDefenseDefinition["topology"] }
  | { kind: "setEconomy"; value: TowerDefenseDefinition["economy"] }
  | { kind: "toggleTargeting"; value: TowerDefenseDefinition["targeting"][number] }
  | { kind: "addMessage" }
  | { kind: "removeMessage"; value: string }
  | { kind: "addBlock"; value: SimulationBlockKind }
  | { kind: "toggleBlock"; value: string }
  | { kind: "removeBlock"; value: string }
  | { kind: "moveBlock"; value: string; direction: "up" | "down" };

const topologies = new Set<TowerDefenseDefinition["topology"]>(["spline", "graph", "lanes"]);
const economies = new Set<TowerDefenseDefinition["economy"]>(["shared", "per-player"]);
const targetModes = new Set<TowerDefenseDefinition["targeting"][number]>(["first", "last", "strongest", "weakest", "nearest"]);
const blockKinds = new Set<SimulationBlockKind>(["spawnWave", "moveEnemies", "acquireTargets", "attackTargets", "applyDamage", "cleanupDead"]);
const defaultFlow = (): SimulationBlock[] => [
  { id: "spawn-wave", kind: "spawnWave", enabled: true },
  { id: "move-enemies", kind: "moveEnemies", enabled: true },
  { id: "acquire-targets", kind: "acquireTargets", enabled: true },
  { id: "attack-targets", kind: "attackTargets", enabled: true },
  { id: "apply-damage", kind: "applyDamage", enabled: true },
  { id: "cleanup-dead", kind: "cleanupDead", enabled: true }
];

export function hydrateDefinition(value: Omit<TowerDefenseDefinition, "flow"> & Partial<Pick<TowerDefenseDefinition, "flow">>): TowerDefenseDefinition {
  return { ...value, flow: value.flow?.length ? value.flow : defaultFlow() };
}

function nextMessageName(messages: NetworkMessage[]) {
  const base = "AbilityActivated";
  if (!messages.some((message) => message.name === base)) return base;
  let suffix = 2;
  while (messages.some((message) => message.name === `${base}${suffix}`)) suffix++;
  return `${base}${suffix}`;
}

/** Applies only whitelisted visual-canvas changes; never blindly merges webview input. */
export function applyCanvasEdit(definition: TowerDefenseDefinition, edit: CanvasEdit): TowerDefenseDefinition {
  const next: TowerDefenseDefinition = structuredClone(definition);
  switch (edit.kind) {
    case "setTopology":
      if (!topologies.has(edit.value)) throw new Error("Unsupported map topology.");
      next.topology = edit.value;
      break;
    case "setEconomy":
      if (!economies.has(edit.value)) throw new Error("Unsupported economy model.");
      next.economy = edit.value;
      break;
    case "toggleTargeting":
      if (!targetModes.has(edit.value)) throw new Error("Unsupported targeting mode.");
      next.targeting = next.targeting.includes(edit.value)
        ? next.targeting.filter((mode) => mode !== edit.value)
        : [...next.targeting, edit.value];
      break;
    case "addMessage":
      next.messages.push({ name: nextMessageName(next.messages), direction: "clientToServer", fields: [] });
      break;
    case "removeMessage":
      next.messages = next.messages.filter((message) => message.name !== edit.value);
      break;
    case "addBlock": {
      if (!blockKinds.has(edit.value)) throw new Error("Unsupported simulation block.");
      const number = next.flow.filter((block) => block.kind === edit.value).length + 1;
      next.flow.push({ id: `${edit.value}-${number}`, kind: edit.value, enabled: true });
      break;
    }
    case "toggleBlock": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block) throw new Error("Simulation block was not found.");
      block.enabled = !block.enabled;
      break;
    }
    case "removeBlock":
      next.flow = next.flow.filter((block) => block.id !== edit.value);
      break;
    case "moveBlock": {
      const index = next.flow.findIndex((block) => block.id === edit.value);
      const destination = edit.direction === "up" ? index - 1 : index + 1;
      if (index < 0) throw new Error("Simulation block was not found.");
      if (destination >= 0 && destination < next.flow.length) [next.flow[index], next.flow[destination]] = [next.flow[destination], next.flow[index]];
      break;
    }
  }
  return next;
}

export const sampleDefinition = (): TowerDefenseDefinition => ({
  version: 1,
  kind: "tower-defense",
  name: "My Tower Defense",
  topology: "spline",
  economy: "shared",
  targeting: ["first", "strongest", "nearest"],
  messages: [{ name: "PlaceTower", direction: "clientToServer", fields: [{ name: "towerId", type: "string" }, { name: "position", type: "Vector3" }] }],
  flow: defaultFlow()
});
