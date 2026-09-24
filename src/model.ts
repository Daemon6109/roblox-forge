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

export const sampleDefinition = (): TowerDefenseDefinition => ({
  version: 1,
  kind: "tower-defense",
  name: "My Tower Defense",
  topology: "spline",
  economy: "shared",
  targeting: ["first", "strongest", "nearest"],
  messages: [{ name: "PlaceTower", direction: "clientToServer", fields: [{ name: "towerId", type: "string" }, { name: "position", type: "Vector3" }] }]
});
