export type Field = { name: string; type: "string" | "number" | "boolean" | "Vector3" | "u16" };
export type SchemaKind = "component" | "resource" | "event";
export type DataSchema = { id: string; name: string; kind: SchemaKind; fields: Field[] };

export type NetworkMessage = {
  name: string;
  direction: "clientToServer" | "serverToClient";
  fields: Field[];
};
export type PackageRealm = "shared" | "server" | "dev";
export type PackageDependency = { id: string; alias: string; spec: string; realm: PackageRealm };

export type SimulationBlockKind = "spawnWave" | "moveEnemies" | "acquireTargets" | "attackTargets" | "applyDamage" | "cleanupDead" | "mutateState" | "condition" | "customSystem";
export type GraphPosition = { x: number; y: number };
export type FlowPort = "next" | "true" | "false";
export type FlowConnection = { from: string; to: string; fromPort?: FlowPort };
export type StateField = "wave" | "currency" | "lives";
export type StateOperand = { source: "literal"; amount: number } | { source: "state"; field: StateField };
export type StateMutation = { field: StateField; operation: "add" | "set"; amount: number; operand?: StateOperand };
export type StateCondition = { field: StateField; comparison: ">=" | ">" | "<=" | "<" | "=="; amount: number };
export type VisualTest = { id: string; name: string; condition: StateCondition };
export type SimulationBlock = { id: string; kind: SimulationBlockKind; enabled: boolean; label: string; position: GraphPosition; config: Record<string, number>; bindings: string[]; stateMutation?: StateMutation; stateCondition?: StateCondition; code?: string };

export type TowerDefenseDefinition = {
  version: 1;
  kind: "tower-defense";
  name: string;
  topology: "spline" | "graph" | "lanes";
  economy: "shared" | "per-player";
  targeting: Array<"first" | "last" | "strongest" | "weakest" | "nearest">;
  messages: NetworkMessage[];
  packages: PackageDependency[];
  flow: SimulationBlock[];
  connections: FlowConnection[];
  schemas: DataSchema[];
  tests: VisualTest[];
};

export type CanvasEdit =
  | { kind: "setTopology"; value: TowerDefenseDefinition["topology"] }
  | { kind: "setEconomy"; value: TowerDefenseDefinition["economy"] }
  | { kind: "toggleTargeting"; value: TowerDefenseDefinition["targeting"][number] }
  | { kind: "addMessage" }
  | { kind: "removeMessage"; value: string }
  | { kind: "setMessageName"; value: string; name: string }
  | { kind: "toggleMessageDirection"; value: string }
  | { kind: "updateMessage"; value: string; message: NetworkMessage }
  | { kind: "addMessageField"; value: string }
  | { kind: "setMessageFieldName"; value: string; fieldIndex: number; name: string }
  | { kind: "setMessageFieldType"; value: string; fieldIndex: number; fieldType: Field["type"] }
  | { kind: "removeMessageField"; value: string; fieldIndex: number }
  | { kind: "addPackage" }
  | { kind: "removePackage"; value: string }
  | { kind: "updatePackage"; value: string; package: PackageDependency }
  | { kind: "addTest" }
  | { kind: "removeTest"; value: string }
  | { kind: "updateTest"; value: string; test: VisualTest }
  | { kind: "addBlock"; value: SimulationBlockKind }
  | { kind: "toggleBlock"; value: string }
  | { kind: "removeBlock"; value: string }
  | { kind: "moveBlock"; value: string; direction: "up" | "down" }
  | { kind: "setBlockPosition"; value: string; position: GraphPosition }
  | { kind: "setBlockLabel"; value: string; label: string }
  | { kind: "setBlockConfig"; value: string; key: string; amount: number }
  | { kind: "setStateMutation"; value: string; mutation: StateMutation }
  | { kind: "setStateCondition"; value: string; condition: StateCondition }
  | { kind: "setBlockCode"; value: string; code: string }
  | { kind: "toggleBlockBinding"; value: string; schemaId: string }
  | { kind: "connectBlocks"; from: string; to: string; fromPort?: FlowPort }
  | { kind: "disconnectBlock"; value: string }
  | { kind: "addSchema"; schemaKind: SchemaKind }
  | { kind: "removeSchema"; value: string }
  | { kind: "setSchemaName"; value: string; name: string }
  | { kind: "addSchemaField"; value: string }
  | { kind: "setSchemaFieldName"; value: string; fieldIndex: number; name: string }
  | { kind: "setSchemaFieldType"; value: string; fieldIndex: number; fieldType: Field["type"] }
  | { kind: "removeSchemaField"; value: string; fieldIndex: number };

const topologies = new Set<TowerDefenseDefinition["topology"]>(["spline", "graph", "lanes"]);
const economies = new Set<TowerDefenseDefinition["economy"]>(["shared", "per-player"]);
const targetModes = new Set<TowerDefenseDefinition["targeting"][number]>(["first", "last", "strongest", "weakest", "nearest"]);
const schemaKinds = new Set<SchemaKind>(["component", "resource", "event"]);
const fieldTypes = new Set<Field["type"]>(["string", "number", "boolean", "Vector3", "u16"]);
const stateFields = new Set<StateField>(["wave", "currency", "lives"]);
const packageRealms = new Set<PackageRealm>(["shared", "server", "dev"]);
const flowPorts = new Set<FlowPort>(["next", "true", "false"]);
const blockKinds = new Set<SimulationBlockKind>(["spawnWave", "moveEnemies", "acquireTargets", "attackTargets", "applyDamage", "cleanupDead", "mutateState", "condition", "customSystem"]);
const blockDefaults: Record<SimulationBlockKind, { label: string; config: Record<string, number> }> = {
  spawnWave: { label: "Spawn Wave", config: { waveIncrement: 1 } },
  moveEnemies: { label: "Move Enemies", config: { speed: 1 } },
  acquireTargets: { label: "Acquire Targets", config: { maxTargets: 1 } },
  attackTargets: { label: "Attack Targets", config: { attacksPerTick: 1 } },
  applyDamage: { label: "Apply Damage", config: { damage: 10 } },
  cleanupDead: { label: "Cleanup Dead", config: { threshold: 0 } },
  mutateState: { label: "Modify Game State", config: {} },
  condition: { label: "If Game State", config: {} },
  customSystem: { label: "Custom System", config: {} }
};

const defaultFlow = (): SimulationBlock[] => [
  { id: "spawn-wave", kind: "spawnWave", enabled: true, position: { x: 260, y: 60 }, bindings: ["game-state"], ...structuredClone(blockDefaults.spawnWave) },
  { id: "move-enemies", kind: "moveEnemies", enabled: true, position: { x: 260, y: 190 }, bindings: ["health"], ...structuredClone(blockDefaults.moveEnemies) },
  { id: "acquire-targets", kind: "acquireTargets", enabled: true, position: { x: 260, y: 320 }, bindings: ["health"], ...structuredClone(blockDefaults.acquireTargets) },
  { id: "attack-targets", kind: "attackTargets", enabled: true, position: { x: 260, y: 450 }, bindings: ["health"], ...structuredClone(blockDefaults.attackTargets) },
  { id: "apply-damage", kind: "applyDamage", enabled: true, position: { x: 260, y: 580 }, bindings: ["health"], ...structuredClone(blockDefaults.applyDamage) },
  { id: "cleanup-dead", kind: "cleanupDead", enabled: true, position: { x: 260, y: 710 }, bindings: ["health"], ...structuredClone(blockDefaults.cleanupDead) }
];

export function hydrateDefinition(value: Omit<TowerDefenseDefinition, "flow" | "connections" | "schemas" | "tests" | "packages"> & Partial<Pick<TowerDefenseDefinition, "flow" | "connections" | "schemas" | "tests" | "packages">>): TowerDefenseDefinition {
  const flow = value.flow?.length ? value.flow.map((block, index) => ({ ...structuredClone(blockDefaults[block.kind]), ...block, bindings: block.bindings ?? [], stateMutation: block.kind === "mutateState" ? { field: "currency" as StateField, operation: "add" as const, amount: 10, ...block.stateMutation, operand: block.stateMutation?.operand ?? { source: "literal" as const, amount: block.stateMutation?.amount ?? 10 } } : block.stateMutation, stateCondition: block.kind === "condition" ? block.stateCondition ?? { field: "lives", comparison: ">", amount: 0 } : block.stateCondition, position: block.position ?? { x: 260, y: 60 + index * 130 }, config: { ...blockDefaults[block.kind].config, ...block.config } })) : defaultFlow();
  const connections = value.connections ?? flow.slice(1).map((block, index) => ({ from: flow[index].id, to: block.id }));
  return { ...value, flow, connections, schemas: value.schemas ?? defaultSchemas(), tests: value.tests ?? defaultTests(), packages: value.packages ?? [] };
}

function nextMessageName(messages: NetworkMessage[]) {
  const base = "AbilityActivated";
  if (!messages.some((message) => message.name === base)) return base;
  let suffix = 2;
  while (messages.some((message) => message.name === `${base}${suffix}`)) suffix++;
  return `${base}${suffix}`;
}

function nextTestId(tests: VisualTest[]) {
  let suffix = tests.length + 1;
  while (tests.some((test) => test.id === `invariant-${suffix}`)) suffix++;
  return `invariant-${suffix}`;
}

function nextPackageId(packages: PackageDependency[]) {
  let suffix = packages.length + 1;
  while (packages.some((item) => item.id === `package-${suffix}`)) suffix++;
  return `package-${suffix}`;
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
    case "setMessageName": {
      const message = next.messages.find((candidate) => candidate.name === edit.value);
      if (!message || !/^[A-Z][A-Za-z0-9]*$/.test(edit.name) || next.messages.some((candidate) => candidate !== message && candidate.name === edit.name)) throw new Error("Network message names must be unique PascalCase.");
      message.name = edit.name;
      break;
    }
    case "toggleMessageDirection": {
      const message = next.messages.find((candidate) => candidate.name === edit.value);
      if (!message) throw new Error("Network message was not found.");
      message.direction = message.direction === "clientToServer" ? "serverToClient" : "clientToServer";
      break;
    }
    case "updateMessage": {
      const index = next.messages.findIndex((candidate) => candidate.name === edit.value);
      const message = edit.message;
      const validName = /^[A-Z][A-Za-z0-9]*$/.test(message.name);
      const validDirection = message.direction === "clientToServer" || message.direction === "serverToClient";
      const validFields = Array.isArray(message.fields) && message.fields.every((field) => /^[a-z][A-Za-z0-9]*$/.test(field.name) && fieldTypes.has(field.type));
      const uniqueFields = validFields && new Set(message.fields.map((field) => field.name)).size === message.fields.length;
      const uniqueName = !next.messages.some((candidate, candidateIndex) => candidateIndex !== index && candidate.name === message.name);
      if (index < 0 || !validName || !validDirection || !uniqueFields || !uniqueName) throw new Error("Network messages need a unique PascalCase name and unique typed camelCase fields.");
      next.messages[index] = structuredClone(message);
      break;
    }
    case "addMessageField": {
      const message = next.messages.find((candidate) => candidate.name === edit.value);
      if (!message) throw new Error("Network message was not found.");
      message.fields.push({ name: `value${message.fields.length + 1}`, type: "number" });
      break;
    }
    case "setMessageFieldName": {
      const message = next.messages.find((candidate) => candidate.name === edit.value);
      if (!message || !message.fields[edit.fieldIndex] || !/^[a-z][A-Za-z0-9]*$/.test(edit.name) || message.fields.some((field, index) => index !== edit.fieldIndex && field.name === edit.name)) throw new Error("Network field names must be unique camelCase.");
      message.fields[edit.fieldIndex].name = edit.name;
      break;
    }
    case "setMessageFieldType": {
      const message = next.messages.find((candidate) => candidate.name === edit.value);
      if (!message || !message.fields[edit.fieldIndex] || !fieldTypes.has(edit.fieldType)) throw new Error("Unsupported network field type.");
      message.fields[edit.fieldIndex].type = edit.fieldType;
      break;
    }
    case "removeMessageField": {
      const message = next.messages.find((candidate) => candidate.name === edit.value);
      if (!message || !message.fields[edit.fieldIndex]) throw new Error("Network field was not found.");
      message.fields.splice(edit.fieldIndex, 1);
      break;
    }
    case "addPackage":
      next.packages.push({ id: nextPackageId(next.packages), alias: `Package${next.packages.length + 1}`, spec: "author/package@0.1.0", realm: "shared" });
      break;
    case "removePackage":
      if (!next.packages.some((item) => item.id === edit.value)) throw new Error("Package was not found.");
      next.packages = next.packages.filter((item) => item.id !== edit.value);
      break;
    case "updatePackage": {
      const index = next.packages.findIndex((item) => item.id === edit.value);
      const item = edit.package;
      const validAlias = /^[A-Za-z][A-Za-z0-9_]*$/.test(item.alias);
      const validSpec = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+@[^\s@]+$/.test(item.spec);
      const uniqueAlias = !next.packages.some((candidate, candidateIndex) => candidateIndex !== index && candidate.alias === item.alias);
      if (index < 0 || !validAlias || !validSpec || !packageRealms.has(item.realm) || !uniqueAlias) throw new Error("Packages need a unique alias, a Wally package spec, and a valid realm.");
      next.packages[index] = { id: edit.value, alias: item.alias, spec: item.spec, realm: item.realm };
      break;
    }
    case "addTest":
      next.tests.push({ id: nextTestId(next.tests), name: `State invariant ${next.tests.length + 1}`, condition: { field: "lives", comparison: ">=", amount: 0 } });
      break;
    case "removeTest":
      if (!next.tests.some((test) => test.id === edit.value)) throw new Error("Visual test was not found.");
      next.tests = next.tests.filter((test) => test.id !== edit.value);
      break;
    case "updateTest": {
      const index = next.tests.findIndex((test) => test.id === edit.value);
      const test = edit.test;
      const validCondition = stateFields.has(test.condition.field) && [">=", ">", "<=", "<", "=="].includes(test.condition.comparison) && Number.isFinite(test.condition.amount);
      const uniqueName = !next.tests.some((candidate, candidateIndex) => candidateIndex !== index && candidate.name === test.name.trim());
      if (index < 0 || !test.name.trim() || test.name.trim().length > 80 || !validCondition || !uniqueName) throw new Error("Visual tests need a unique name and valid state condition.");
      next.tests[index] = { id: edit.value, name: test.name.trim(), condition: structuredClone(test.condition) };
      break;
    }
    case "addBlock": {
      if (!blockKinds.has(edit.value)) throw new Error("Unsupported simulation block.");
      const number = next.flow.filter((block) => block.kind === edit.value).length + 1;
      next.flow.push({ id: `${edit.value}-${number}`, kind: edit.value, enabled: true, bindings: [], stateMutation: edit.value === "mutateState" ? { field: "currency", operation: "add", amount: 10, operand: { source: "literal", amount: 10 } } : undefined, stateCondition: edit.value === "condition" ? { field: "lives", comparison: ">", amount: 0 } : undefined, position: { x: 480, y: 100 + number * 45 }, ...structuredClone(blockDefaults[edit.value]) });
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
    case "setStateMutation": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      const operand = edit.mutation.operand ?? { source: "literal", amount: edit.mutation.amount };
      if (!block || block.kind !== "mutateState" || !stateFields.has(edit.mutation.field) || !["add", "set"].includes(edit.mutation.operation) || !Number.isFinite(edit.mutation.amount) || (operand.source === "literal" && !Number.isFinite(operand.amount)) || (operand.source === "state" && !stateFields.has(operand.field))) throw new Error("Invalid state mutation.");
      block.stateMutation = { ...edit.mutation, operand };
      break;
    }
    case "setStateCondition": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || block.kind !== "condition" || !stateFields.has(edit.condition.field) || ![">=", ">", "<=", "<", "=="].includes(edit.condition.comparison) || !Number.isFinite(edit.condition.amount)) throw new Error("Invalid state condition.");
      block.stateCondition = { ...edit.condition };
      break;
    }
    case "setBlockCode": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || block.kind !== "customSystem") throw new Error("Only Custom System blocks accept custom Luau.");
      if (edit.code.length > 20_000) throw new Error("Custom system code is limited to 20,000 characters.");
      block.code = edit.code;
      break;
    }
    case "toggleBlockBinding": {
      const block = next.flow.find((candidate) => candidate.id === edit.value);
      if (!block || !next.schemas.some((schema) => schema.id === edit.schemaId)) throw new Error("Invalid schema binding.");
      block.bindings = block.bindings.includes(edit.schemaId) ? block.bindings.filter((id) => id !== edit.schemaId) : [...block.bindings, edit.schemaId];
      break;
    }
    case "connectBlocks": {
      const source = next.flow.find((block) => block.id === edit.from);
      const port = edit.fromPort ?? "next";
      if (edit.from === edit.to || !source || !next.flow.some((block) => block.id === edit.to) || !flowPorts.has(port) || (source.kind !== "condition" && port !== "next") || (source.kind === "condition" && port === "next")) throw new Error("Invalid graph connection.");
      next.connections = next.connections.filter((connection) => (connection.from !== edit.from || (connection.fromPort ?? "next") !== port) && connection.to !== edit.to);
      next.connections.push({ from: edit.from, to: edit.to, fromPort: port });
      break;
    }
    case "disconnectBlock":
      next.connections = next.connections.filter((connection) => connection.from !== edit.value);
      break;
    case "addSchema": {
      const schemaKind = edit.schemaKind ?? (edit as unknown as { value?: SchemaKind }).value;
      if (!schemaKind || !schemaKinds.has(schemaKind)) throw new Error("Unsupported schema kind.");
      const count = next.schemas.filter((schema) => schema.kind === schemaKind).length + 1;
      const title = schemaKind[0].toUpperCase() + schemaKind.slice(1);
      next.schemas.push({ id: `${schemaKind}-${count}`, name: `${title}${count}`, kind: schemaKind, fields: [{ name: "value", type: "number" }] });
      break;
    }
    case "removeSchema":
      next.schemas = next.schemas.filter((schema) => schema.id !== edit.value);
      next.flow.forEach((block) => { block.bindings = block.bindings.filter((binding) => binding !== edit.value); });
      break;
    case "setSchemaName": {
      const schema = next.schemas.find((candidate) => candidate.id === edit.value);
      if (!schema || !/^[A-Z][A-Za-z0-9]*$/.test(edit.name)) throw new Error("Schema names must be PascalCase.");
      schema.name = edit.name;
      break;
    }
    case "addSchemaField": {
      const schema = next.schemas.find((candidate) => candidate.id === edit.value);
      if (!schema) throw new Error("Schema was not found.");
      schema.fields.push({ name: `value${schema.fields.length + 1}`, type: "number" });
      break;
    }
    case "setSchemaFieldName": {
      const schema = next.schemas.find((candidate) => candidate.id === edit.value);
      if (!schema || !schema.fields[edit.fieldIndex] || !/^[a-z][A-Za-z0-9]*$/.test(edit.name)) throw new Error("Schema field names must be camelCase.");
      if (schema.fields.some((field, index) => index !== edit.fieldIndex && field.name === edit.name)) throw new Error("Schema field names must be unique.");
      schema.fields[edit.fieldIndex].name = edit.name;
      break;
    }
    case "setSchemaFieldType": {
      const schema = next.schemas.find((candidate) => candidate.id === edit.value);
      if (!schema || !schema.fields[edit.fieldIndex] || !fieldTypes.has(edit.fieldType)) throw new Error("Unsupported schema field type.");
      schema.fields[edit.fieldIndex].type = edit.fieldType;
      break;
    }
    case "removeSchemaField": {
      const schema = next.schemas.find((candidate) => candidate.id === edit.value);
      if (!schema || !schema.fields[edit.fieldIndex]) throw new Error("Schema field was not found.");
      if (schema.fields.length === 1) throw new Error("Schemas need at least one field.");
      schema.fields.splice(edit.fieldIndex, 1);
      break;
    }
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
    packages: [],
    flow,
    connections: flow.slice(1).map((block, index) => ({ from: flow[index].id, to: block.id })),
    schemas: defaultSchemas()
    ,tests: defaultTests()
  };
};

function defaultSchemas(): DataSchema[] {
  return [
    { id: "health", name: "Health", kind: "component", fields: [{ name: "current", type: "number" }, { name: "maximum", type: "number" }] },
    { id: "game-state", name: "GameState", kind: "resource", fields: [{ name: "wave", type: "number" }, { name: "lives", type: "number" }] },
    { id: "tower-placed", name: "TowerPlaced", kind: "event", fields: [{ name: "towerId", type: "string" }, { name: "position", type: "Vector3" }] }
  ];
}

function defaultTests(): VisualTest[] {
  return [{ id: "lives-nonnegative", name: "Lives never become negative", condition: { field: "lives", comparison: ">=", amount: 0 } }];
}
