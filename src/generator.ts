import type { Field, TowerDefenseDefinition } from "./model";
import { validateDefinition } from "./validation";
import { scheduleBlocks } from "./graph";

export type GeneratedFile = { path: string; content: string };

const luauType = (field: Field) => field.type === "u16" ? "number" : field.type;
const quote = (value: string) => JSON.stringify(value);
const functionName = (id: string) => id.replace(/[^A-Za-z0-9]+(.)?/g, (_, following: string | undefined) => following ? following.toUpperCase() : "");

const systemFunctions: Record<TowerDefenseDefinition["flow"][number]["kind"], { label: string; primary: string }> = {
  spawnWave: { label: "Spawn Wave", primary: "waveIncrement" },
  moveEnemies: { label: "Move Enemies", primary: "speed" },
  acquireTargets: { label: "Acquire Targets", primary: "maxTargets" },
  attackTargets: { label: "Attack Targets", primary: "attacksPerTick" },
  applyDamage: { label: "Apply Damage", primary: "damage" },
  cleanupDead: { label: "Cleanup Dead", primary: "threshold" },
  mutateState: { label: "Modify Game State", primary: "" },
  condition: { label: "If Game State", primary: "" },
  callRoutine: { label: "Run Routine", primary: "" },
  customSystem: { label: "Custom System", primary: "" }
};

function mutationResult(mutation: { field: "wave" | "currency" | "lives"; operation: "add" | "set"; amount: number; operand?: { source: "literal"; amount: number } | { source: "state"; field: "wave" | "currency" | "lives" } }, label: string) {
  const operand = mutation.operand?.source === "state" ? `state.${mutation.operand.field}` : String(mutation.operand?.source === "literal" ? mutation.operand.amount : mutation.amount);
  const value = mutation.operation === "add" ? `state.${mutation.field} + ${operand}` : operand;
  return `{ wave = ${mutation.field === "wave" ? value : "state.wave"}, currency = ${mutation.field === "currency" ? value : "state.currency"}, lives = ${mutation.field === "lives" ? value : "state.lives"}, tick = state.tick + 1, lastSystem = ${quote(label)}, lastValue = ${mutation.amount} }`;
}

export function generateTowerDefense(definition: TowerDefenseDefinition): GeneratedFile[] {
  const diagnostics = validateDefinition(definition);
  if (diagnostics.length) throw new Error(diagnostics.map((item) => `${item.path}: ${item.message}`).join("\n"));
  const messageTypes = definition.messages.map((message) => `export type ${message.name} = {\n${message.fields.map((field) => `\t${field.name}: ${luauType(field)},`).join("\n")}\n}`).join("\n\n");
  const messages = definition.messages.map((message) => `\t${message.name} = { direction = ${quote(message.direction)} },`).join("\n");
  const targetModes = definition.targeting.map(quote).join(", ");
  const towerCatalog = definition.towers.map((tower) => `\t${tower.name} = { id = ${quote(tower.id)}, cost = ${tower.cost}, damage = ${tower.damage}, range = ${tower.range}, cooldown = ${tower.cooldown}, targeting = ${quote(tower.targeting)} },`).join("\n");
  const enemyCatalog = definition.enemies.map((enemy) => `\t${enemy.name} = { id = ${quote(enemy.id)}, health = ${enemy.health}, speed = ${enemy.speed}, reward = ${enemy.reward} },`).join("\n");
  const waves = definition.waves.map((wave) => `\t{ wave = ${wave.wave}, enemyId = ${quote(wave.enemyId)}, count = ${wave.count}, interval = ${wave.interval} },`).join("\n");
  const packagesFor = (realm: "shared" | "server" | "dev") => definition.packages.filter((item) => item.realm === realm).map((item) => `${item.alias} = ${quote(item.spec)}`).join("\n");
  const packageSections = (["shared", "server", "dev"] as const).filter((realm) => packagesFor(realm)).map((realm) => `[${realm === "shared" ? "dependencies" : `${realm}-dependencies`}]
${packagesFor(realm)}`).join("\n\n");
  const schemaTypes = definition.schemas.map((schema) => `export type ${schema.name} = {\n${schema.fields.map((field) => `\t${field.name}: ${luauType(field)},`).join("\n")}\n}`).join("\n\n");
  const schemaNames = new Map(definition.schemas.map((schema) => [schema.id, schema.name]));
  const invariantTests = definition.tests.map((test) => `test.case(${quote(test.name)}, function(asserts)\n\tlocal state = Simulation.step({ wave = 0, currency = 500, lives = 20, tick = 0, lastSystem = "", lastValue = 0 })\n\tasserts.truthy(state.${test.condition.field} ${test.condition.comparison} ${test.condition.amount})\nend)`).join("\n\n");
  const enabledBlocks = scheduleBlocks(definition);
  const contextTypes = [...new Set(enabledBlocks.flatMap((block) => block.bindings).map((id) => schemaNames.get(id)).filter((name): name is string => Boolean(name)))].map((name) => `\t${name}: GameSchema.${name}?,`).join("\n");
  const routineFunctions = definition.routines.map((routine) => `local function run${routine.name}(state: State, context: Context): State\n\t-- Reusable visual routine (${routine.id}); call it from any Run Routine graph block.\n${routine.steps.map((step) => `\tstate = ${mutationResult(step, routine.name)}`).join("\n")}\n\treturn state\nend`).join("\n\n");
  const helpers = enabledBlocks.map((block) => {
    const system = systemFunctions[block.kind];
    const contract = block.bindings.map((id) => schemaNames.get(id)).filter(Boolean).join(", ") || "no visual data bindings";
    if (block.kind === "customSystem") return `local function ${functionName(block.id)}(state: State, context: Context): State\n\t-- Custom System block (${block.id}); binds ${contract}. Edit this from the Forge graph inspector.\n-- <forge:user-code id="${block.id}">\n${block.code?.trim() || "\treturn state"}\n-- </forge:user-code>\nend`;
    if (block.kind === "callRoutine") {
      const routine = definition.routines.find((candidate) => candidate.id === block.routineId)!;
      return `local function ${functionName(block.id)}(state: State, context: Context): State\n\t-- Calls reusable visual routine ${routine.name}; binds ${contract}.\n\treturn run${routine.name}(state, context)\nend`;
    }
    if (block.kind === "mutateState") {
      const mutation = block.stateMutation ?? { field: "currency", operation: "add", amount: 10 };
      const operand = mutation.operand?.source === "state" ? `state.${mutation.operand.field}` : String(mutation.operand?.source === "literal" ? mutation.operand.amount : mutation.amount);
      const value = mutation.operation === "add" ? `state.${mutation.field} + ${operand}` : operand;
      return `local function ${functionName(block.id)}(state: State, context: Context): State\n\t-- Visual state mutation: ${mutation.operation} ${operand} to ${mutation.field}; binds ${contract}.\n\treturn { wave = ${mutation.field === "wave" ? value : "state.wave"}, currency = ${mutation.field === "currency" ? value : "state.currency"}, lives = ${mutation.field === "lives" ? value : "state.lives"}, tick = state.tick + 1, lastSystem = ${quote(block.label)}, lastValue = ${mutation.amount} }\nend`;
    }
    if (block.kind === "condition") {
      const condition = block.stateCondition ?? { field: "lives", comparison: ">", amount: 0 };
      return `local function ${functionName(block.id)}(state: State, context: Context): State\n\t-- Visual branch: state.${condition.field} ${condition.comparison} ${condition.amount}; binds ${contract}.\n\treturn { wave = state.wave, currency = state.currency, lives = state.lives, tick = state.tick + 1, lastSystem = ${quote(block.label)}, lastValue = ${condition.amount} }\nend`;
    }
    const primaryValue = block.config[system.primary];
    const wave = block.kind === "spawnWave" ? `state.wave + ${primaryValue}` : "state.wave";
    return `local function ${functionName(block.id)}(state: State, context: Context): State\n\t-- ${system.label} block (${block.id}); binds ${contract}; visual property ${system.primary} = ${primaryValue}\n\treturn { wave = ${wave}, currency = state.currency, lives = state.lives, tick = state.tick + 1, lastSystem = ${quote(block.label)}, lastValue = ${primaryValue} }\nend`;
  }).join("\n\n");
  const hasConditions = enabledBlocks.some((block) => block.kind === "condition");
  const pipeline = enabledBlocks.map((block) => `\tstate = ${functionName(block.id)}(state, context)`).join("\n");
  const enabledIds = new Set(enabledBlocks.map((block) => block.id));
  const branchConnections = definition.connections.filter((connection) => enabledIds.has(connection.from) && enabledIds.has(connection.to));
  const incoming = new Set(branchConnections.map((connection) => connection.to));
  const roots = enabledBlocks.filter((block) => !incoming.has(block.id));
  const functionTable = enabledBlocks.map((block) => `\t[${quote(block.id)}] = ${functionName(block.id)},`).join("\n");
  const routes = enabledBlocks.filter((block) => block.kind === "condition").map((block) => {
    const condition = block.stateCondition ?? { field: "lives", comparison: ">", amount: 0 };
    return `\t[${quote(block.id)}] = function(state: State): string\n\t\treturn state.${condition.field} ${condition.comparison} ${condition.amount} and "true" or "false"\n\tend,`;
  }).join("\n");
  const nexts = enabledBlocks.map((block) => {
    const connections = branchConnections.filter((connection) => connection.from === block.id);
    const entries = connections.map((connection) => `\t\t[${quote(connection.fromPort ?? "next")}] = ${quote(connection.to)},`).join("\n");
    return `\t[${quote(block.id)}] = {\n${entries}\n\t},`;
  }).join("\n");
  const branchPipeline = `local blockFunctions: { [string]: (State, Context) -> State } = {\n${functionTable}\n}\nlocal nextByBlock: { [string]: { [string]: string } } = {\n${nexts}\n}\nlocal branchByBlock: { [string]: (State) -> string } = {\n${routes}\n}\n\nlocal function runFrom(id: string?, state: State, context: Context): State\n\tlocal visited: { [string]: boolean } = {}\n\twhile id ~= nil do\n\t\tassert(not visited[id], "Forge execution graph contains a cycle")\n\t\tvisited[id] = true\n\t\tstate = blockFunctions[id](state, context)\n\t\tlocal branch = branchByBlock[id]\n\t\tlocal port = branch and branch(state) or "next"\n\t\tid = nextByBlock[id][port]\n\tend\n\treturn state\nend`;
  const simulationExecution = hasConditions ? `${branchPipeline}\n\nfunction Simulation.step(state: State, context: Context?): State\n\tassert(state.lives >= 0, "lives cannot be negative")\n\tcontext = context or {}\n${roots.map((block) => `\tstate = runFrom(${quote(block.id)}, state, context)`).join("\n") || "\treturn state"}\n\treturn state\nend` : `function Simulation.step(state: State, context: Context?): State\n\tassert(state.lives >= 0, "lives cannot be negative")\n\tcontext = context or {}\n${pipeline || "\treturn state"}\n\treturn state\nend`;
  return [
    { path: ".forge/tower-defense.json", content: JSON.stringify(definition, null, 2) + "\n" },
    { path: "wally.toml", content: `[package]\nname = "generated/${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}"\nversion = "0.1.0"\nregistry = "https://github.com/UpliftGames/wally-index"${packageSections ? `\n\n${packageSections}` : ""}\n` },
    { path: "default.project.json", content: JSON.stringify({ name: definition.name, tree: { $className: "DataModel", ReplicatedStorage: { Shared: { $path: "src/shared" } }, ServerScriptService: { Server: { $path: "src/server" } }, StarterPlayer: { StarterPlayerScripts: { Client: { $path: "src/client" } } } } }, null, 2) + "\n" },
    { path: "src/shared/domain/TowerDefenseConfig.luau", content: `-- Generated by Roblox Forge. Use the named user-code region for supported custom logic.\n\nexport type TargetMode = ${definition.targeting.map(quote).join(" | ")}\n\n-- <forge:user-code id="targeting-extensions">\n-- Add pure targeting helpers here. This region survives regeneration.\n-- </forge:user-code>\n\nreturn {\n\ttopology = ${quote(definition.topology)},\n\teconomy = ${quote(definition.economy)},\n\ttargetModes = { ${targetModes} },\n}\n` },
    { path: "src/shared/domain/TowerCatalog.luau", content: `-- Generated authored tower catalog. This is pure Luau data.\n\nexport type Tower = { id: string, cost: number, damage: number, range: number, cooldown: number, targeting: string }\n\nreturn {\n${towerCatalog}\n}\n` },
    { path: "src/shared/domain/EnemyCatalog.luau", content: `-- Generated authored enemy catalog. This is pure Luau data.\n\nexport type Enemy = { id: string, health: number, speed: number, reward: number }\n\nreturn {\n${enemyCatalog}\n}\n` },
    { path: "src/shared/domain/WaveSchedule.luau", content: `-- Generated authored wave schedule. This is pure Luau data.\n\nexport type Spawn = { wave: number, enemyId: string, count: number, interval: number }\n\nreturn {\n${waves}\n}\n` },
    { path: "src/shared/domain/TowerDefenseSimulator.luau", content: `-- Generated deterministic Tower Defense simulator. No Roblox APIs required.\n\nlocal Towers = require(script.Parent.TowerCatalog)\nlocal Enemies = require(script.Parent.EnemyCatalog)\nlocal WaveSchedule = require(script.Parent.WaveSchedule)\n\nexport type Summary = { runs: number, wavesProcessed: number, spawned: number, defeated: number, leaked: number, rewards: number }\n\nlocal Simulator = {}\n\nlocal function enemyById(id: string)\n\tfor _, enemy in pairs(Enemies) do\n\t\tif enemy.id == id then return enemy end\n\tend\n\terror(\"Authored wave references missing enemy: \" .. id)\nend\n\nlocal function totalDamagePerSecond(): number\n\tlocal dps = 0\n\tfor _, tower in pairs(Towers) do\n\t\tdps += tower.damage / tower.cooldown\n\tend\n\treturn dps\nend\n\nfunction Simulator.simulate(runs: number?): Summary\n\tlocal summary: Summary = { runs = runs or 1, wavesProcessed = 0, spawned = 0, defeated = 0, leaked = 0, rewards = 0 }\n\tlocal dps = totalDamagePerSecond()\n\tfor _ = 1, summary.runs do\n\t\tfor _, spawn in ipairs(WaveSchedule) do\n\t\t\tlocal enemy = enemyById(spawn.enemyId)\n\t\t\tlocal timeToDefeat = enemy.health / dps\n\t\t\tlocal timeToExit = 100 / enemy.speed\n\t\t\tsummary.wavesProcessed += 1\n\t\t\tsummary.spawned += spawn.count\n\t\t\tif timeToDefeat <= timeToExit then\n\t\t\t\tsummary.defeated += spawn.count\n\t\t\t\tsummary.rewards += spawn.count * enemy.reward\n\t\t\telse\n\t\t\t\tsummary.leaked += spawn.count\n\t\t\tend\n\t\tend\n\tend\n\treturn summary\nend\n\nreturn Simulator\n` },
    { path: "src/shared/schemas/Network.luau", content: `-- Generated Lync-facing contract types.\n\n${messageTypes}\n\nreturn {\n${messages}\n}\n` },
    { path: "src/shared/schemas/GameSchema.luau", content: `-- Generated data contracts for visual Components, Resources, and Events.\n\n${schemaTypes}\n\nreturn {}\n` },
    { path: "src/shared/domain/Simulation.luau", content: `-- Pure domain boundary generated from the Forge block graph.\n\nlocal GameSchema = require(script.Parent.Parent.schemas.GameSchema)\n\nexport type State = { wave: number, currency: number, lives: number, tick: number, lastSystem: string, lastValue: number }\nexport type Context = {\n${contextTypes}\n}\n\nlocal Simulation = {}\n\n${routineFunctions}${routineFunctions ? "\n\n" : ""}${helpers}\n\n-- <forge:user-code id="simulation-extensions">\n-- Add pure domain helpers here. This region survives regeneration.\n-- </forge:user-code>\n\n${simulationExecution}\n\nreturn Simulation\n` },
    { path: "tests/domain/Simulation.spec.luau", content: `local test = require("@std/test")\nlocal Simulation = require(script.Parent.Parent.Parent.src.shared.domain.Simulation)\nlocal Towers = require(script.Parent.Parent.Parent.src.shared.domain.TowerCatalog)\nlocal Enemies = require(script.Parent.Parent.Parent.src.shared.domain.EnemyCatalog)\nlocal Waves = require(script.Parent.Parent.Parent.src.shared.domain.WaveSchedule)\nlocal TowerDefenseSimulator = require(script.Parent.Parent.Parent.src.shared.domain.TowerDefenseSimulator)\n\ntest.case("runs generated simulation", function(asserts)\n\tlocal nextState = Simulation.step({ wave = 0, currency = 500, lives = 20, tick = 0, lastSystem = "", lastValue = 0 })\n\tasserts.eq(${enabledBlocks.some((block) => block.kind === "spawnWave") ? enabledBlocks.find((block) => block.kind === "spawnWave")?.config.waveIncrement : 0}, nextState.wave)\n\tasserts.eq(${enabledBlocks.length}, nextState.tick)\nend)\n\ntest.case("authored Tower Defense catalog is valid", function(asserts)\n\tasserts.truthy(next(Towers) ~= nil)\n\tasserts.truthy(next(Enemies) ~= nil)\n\tfor _, spawn in Waves do\n\t\tasserts.truthy(spawn.count > 0 and spawn.interval > 0)\n\tend\nend)\n\ntest.case("simulates authored waves without Studio", function(asserts)\n\tlocal summary = TowerDefenseSimulator.simulate(10)\n\tasserts.truthy(summary.wavesProcessed > 0)\n\tasserts.eq(summary.spawned, summary.defeated + summary.leaked)\nend)\n\n${invariantTests}\n` }
  ];
}
