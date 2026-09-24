export type Field = { name: string; type: "string" | "number" | "boolean" | "Vector3" | "u16" };

export type NetworkMessage = {
  name: string;
  direction: "clientToServer" | "serverToClient";
  fields: Field[];
};

export type TowerDefenseDefinition = {
  version: 1;
  kind: "tower-defense";
  name: string;
  topology: "spline" | "graph" | "lanes";
  economy: "shared" | "per-player";
  targeting: Array<"first" | "last" | "strongest" | "weakest" | "nearest">;
  messages: NetworkMessage[];
};

export type CanvasEdit =
  | { kind: "setTopology"; value: TowerDefenseDefinition["topology"] }
  | { kind: "setEconomy"; value: TowerDefenseDefinition["economy"] }
  | { kind: "toggleTargeting"; value: TowerDefenseDefinition["targeting"][number] }
  | { kind: "addMessage" }
  | { kind: "removeMessage"; value: string };

const topologies = new Set<TowerDefenseDefinition["topology"]>(["spline", "graph", "lanes"]);
const economies = new Set<TowerDefenseDefinition["economy"]>(["shared", "per-player"]);
const targetModes = new Set<TowerDefenseDefinition["targeting"][number]>(["first", "last", "strongest", "weakest", "nearest"]);

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
  messages: [{ name: "PlaceTower", direction: "clientToServer", fields: [{ name: "towerId", type: "string" }, { name: "position", type: "Vector3" }] }]
});
