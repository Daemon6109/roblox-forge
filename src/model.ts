export type Field = { name: string; type: "string" | "number" | "boolean" | "Vector3" | "u16" };

export type NetworkMessage = {
  name: string;
  direction: "clientToServer" | "serverToClient";
  fields: Field[];
};

export type SimulationBlockKind = "spawnWave" | "moveEnemies" | "acquireTargets" | "attackTargets" | "applyDamage" | "cleanupDead" | "customSystem";
export type GraphPosition = { x: number; y: number };
export type FlowConnection = { from: string; to: string };
export type SimulationBlock = { id: string; kind: SimulationBlockKind; enabled: boolean; label: string; position: GraphPosition; config: Record<string, number>; code?: string };

export type TowerDefenseDefinition = {
  version: 1;
  kind: "tower-defense";
  name: string;
  topology: "spline" | "graph" | "lanes";
  economy: "shared" | "per-player";
  targeting: Array<"first" | "last" | "strongest" | "weakest" | "nearest">;
  messages: NetworkMessage[];
  flow: SimulationBlock[];
  connections: FlowConnection[];
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
  | { kind: "moveBlock"; value: string; direction: "up" | "down" }
  | { kind: "setBlockPosition"; value: string; position: GraphPosition }
  | { kind: "setBlockLabel"; value: string; label: string }
  | { kind: "setBlockConfig"; value: string; key: string; amount: number }
  | { kind: "setBlockCode"; value: string; code: string }
  | { kind: "connectBlocks"; from: string; to: string }
  | { kind: "disconnectBlock"; value: string };

const topologies = new Set<TowerDefenseDefinition["topology"]>(["spline", "graph", "lanes"]);
const economies = new Set<TowerDefenseDefinition["economy"]>(["shared", "per-player"]);
const targetModes = new Set<TowerDefenseDefinition["targeting"][number]>(["first", "last", "strongest", "weakest", "nearest"]);
const blockKinds = new Set<SimulationBlockKind>(["spawnWave", "moveEnemies", "acquireTargets", "attackTargets", "applyDamage", "cleanupDead", "customSystem"]);
const blockDefaults: Record<SimulationBlockKind, { label: string; config: Record<string, number> }> = {
  spawnWave: { label: "Spawn Wave", config: { waveIncrement: 1 } },
  moveEnemies: { label: "Move Enemies", config: { speed: 1 } },
  acquireTargets: { label: "Acquire Targets", config: { maxTargets: 1 } },
  attackTargets: { label: "Attack Targets", config: { attacksPerTick: 1 } },
  applyDamage: { label: "Apply Damage", config: { damage: 10 } },
  cleanupDead: { label: "Cleanup Dead", config: { threshold: 0 } },
  customSystem: { label: "Custom System", config: {} }
};

const defaultFlow = (): SimulationBlock[] => [
  { id: "spawn-wave", kind: "spawnWave", enabled: true, position: { x: 260, y: 60 }, ...structuredClone(blockDefaults.spawnWave) },
  { id: "move-enemies", kind: "moveEnemies", enabled: true, position: { x: 260, y: 190 }, ...structuredClone(blockDefaults.moveEnemies) },
  { id: "acquire-targets", kind: "acquireTargets", enabled: true, position: { x: 260, y: 320 }, ...structuredClone(blockDefaults.acquireTargets) },
  { id: "attack-targets", kind: "attackTargets", enabled: true, position: { x: 260, y: 450 }, ...structuredClone(blockDefaults.attackTargets) },
  { id: "apply-damage", kind: "applyDamage", enabled: true, position: { x: 260, y: 580 }, ...structuredClone(blockDefaults.applyDamage) },
  { id: "cleanup-dead", kind: "cleanupDead", enabled: true, position: { x: 260, y: 710 }, ...structuredClone(blockDefaults.cleanupDead) }
];

export function hydrateDefinition(value: Omit<TowerDefenseDefinition, "flow" | "connections"> & Partial<Pick<TowerDefenseDefinition, "flow" | "connections">>): TowerDefenseDefinition {
  const flow = value.flow?.length ? value.flow.map((block, index) => ({ ...structuredClone(blockDefaults[block.kind]), ...block, position: block.position ?? { x: 260, y: 60 + index * 130 }, config: { ...blockDefaults[block.kind].config, ...block.config } })) : defaultFlow();
  const connections = value.connections ?? flow.slice(1).map((block, index) => ({ from: flow[index].id, to: block.id }));
  return { ...value, flow, connections };
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
      next.flow.push({ id: `${edit.value}-${number}`, kind: edit.value, enabled: true, position: { x: 480, y: 100 + number * 45 }, ...structuredClone(blockDefaults[edit.value]) });
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
      next.connections = next.connections.filter((connection) => connection.from !== edit.value && connection.to !== edit.value);
      break;
    case "moveBlock": {
      const index = next.flow.findIndex((block) => block.id === edit.value);
      const destination = edit.direction === "up" ? index - 1 : index + 1;
      if (index < 0) throw new Error("Simulation block was not found.");
      if (destination >= 0 && destination < next.flow.length) [next.flow[index], next.flow[destination]] = [next.flow[destination], next.flow[index]];
      break;
    }
    case "setBlockPosition": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || !Number.isFinite(edit.position.x) || !Number.isFinite(edit.position.y)) throw new Error("Invalid graph position.");
      block.position = { x: Math.max(0, Math.round(edit.position.x)), y: Math.max(0, Math.round(edit.position.y)) };
      break;
    }
    case "setBlockLabel": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || !edit.label.trim()) throw new Error("A block label is required.");
      block.label = edit.label.trim().slice(0, 60);
      break;
    }
    case "setBlockConfig": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || !(edit.key in blockDefaults[block.kind].config) || !Number.isFinite(edit.amount)) throw new Error("Invalid block property.");
      block.config[edit.key] = edit.amount;
      break;
    }
    case "setBlockCode": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || block.kind !== "customSystem") throw new Error("Only Custom System blocks accept custom Luau.");
      if (edit.code.length > 20_000) throw new Error("Custom system code is limited to 20,000 characters.");
      block.code = edit.code;
      break;
    }
    case "connectBlocks": {
      if (edit.from === edit.to || !next.flow.some((block) => block.id === edit.from) || !next.flow.some((block) => block.id === edit.to)) throw new Error("Invalid graph connection.");
      next.connections = next.connections.filter((connection) => connection.from !== edit.from && connection.to !== edit.to);
      next.connections.push({ from: edit.from, to: edit.to });
      break;
    }
    case "disconnectBlock":
      next.connections = next.connections.filter((connection) => connection.from !== edit.value);
      break;
  }
  return next;
}

export const sampleDefinition = (): TowerDefenseDefinition => {
  const flow = defaultFlow();
  return {
    version: 1,
    kind: "tower-defense",
    name: "My Tower Defense",
    topology: "spline",
    economy: "shared",
    targeting: ["first", "strongest", "nearest"],
    messages: [{ name: "PlaceTower", direction: "clientToServer", fields: [{ name: "towerId", type: "string" }, { name: "position", type: "Vector3" }] }],
    flow,
    connections: flow.slice(1).map((block, index) => ({ from: flow[index].id, to: block.id }))
  };
};
