# Roblox Forge Delivery Map

This is the source-of-truth checklist for the requested local-first visual Roblox/Luau game-development environment. It intentionally distinguishes **shipped**, **scaffolded**, and **not built**. A generated stub is not called an integration.

Legend: ✅ shipped and tested · 🟡 scaffolded/partial · ⬜ not built

## Core editor and project ownership

- ✅ VS Code extension foundation and public GitHub repository.
- 🟡 Visual systems canvas: has a project front page, factory inspector, draggable persisted block positions, typed execution wires, editable Component/Resource/Event contracts, system-to-contract bindings, visual state expressions (set/add/subtract/multiply/divide/min/max) with literal/state operands, and true/false conditional branches. Typed arbitrary data ports, loops, and nested reusable subgraphs are still missing.
- ✅ Transparent `.forge/tower-defense.json` visual-definition source.
- ✅ Normal generated Luau, Rojo mapping, Wally manifest, and test skeleton.
- 🟡 Generated-file ownership rule: named user-code regions in generated Luau survive regeneration; custom attachments, source mapping, and broader safe round-trip editing are not implemented.
- 🟡 Project Explorer ships factory, system, data-contract, networking, generated-code, and test navigation. Asset indexing and multi-factory project organization remain.
- 🟡 Inspector/properties editor, graph drag/drop, session undo/redo, a Forge command palette, deterministic graph auto-layout, and durable diffable snapshots under `.forge/history` are shipped. Breadcrumbs and deeper search/refactor coverage remain.
- ⬜ Progressive code escape hatches: expressions/rules, custom Luau attachments, source mapping, and visual-to-code navigation.

## Architecture and code generation

- ✅ Generated project separates `src/shared/domain` from Roblox adapter destinations.
- 🟡 Pure simulation boundary: an ordered visual block pipeline now generates typed Luau state-transition functions and a typed context from bound visual data contracts; deep gameplay behavior is still factory work.
- 🟡 Visual network contracts now own message names, directions, and typed fields; generation emits normal typed Luau contract shapes. It does not call Lync or create real Roblox remotes yet.
- 🟡 Tower Defense factory records topology, economy, targeting, and messages.
- ⬜ Component/entity/archetype/system/query/schedule authoring.
- ⬜ Roblox client/server adapter generation: Instances, Players, remotes, presentation, input, sounds, DataStores.
- 🟡 Reusable pure routines are authored from visual state steps and callable from the systems graph. Nested arbitrary subgraphs, factory composition, dependencies, extension points, conflict detection, extraction, and factory authoring remain.

## Toolchain and feedback loop

- ✅ TypeScript generator tests, extension-host test, and GitHub Actions verification.
- ✅ Every `main` commit now produces a verified `.vsix` artifact and a downloadable GitHub prerelease.
- 🟡 Rojo configuration generation and a real `rojo build` runner are available through Build & Test; Studio sync/serve lifecycle is still missing.
- 🟡 Wally manifest generation, visual add/remove/update package declarations with Shared/Server/Development realms, and an explicit Wally install command that writes normal package/lock state. Package search and lock validation remain.
- ⬜ StyLua formatting and format diagnostics.
- ⬜ Selene linting and clickable graph diagnostics.
- ⬜ Luau static analysis.
- 🟡 Generated projects now pin Lute in `rokit.toml`, and Forge can install the pinned Lute/Rojo toolchain. Lute execution, fuzzing, benchmarks, and richer fast-feedback orchestration remain.
- ⬜ Unified **Build & Test** panel with clear results instead of raw terminal output.

## Gameplay integrations and factories

- ⬜ JECS integration and visual ECS authoring (components, relationships, queries, schedules).
- ⬜ Lync integration: actual typed remotes, serialization, reliability configuration, and visible request/validation/simulation/replication pipelines.
- ⬜ Lyra integration: player data schemas, defaults, validation, migrations, generated fixtures, load/unload wiring, and migration tests.
- 🟡 Tower Defense factory: project wizard, configurable simulation block pipeline, visual authored tower/enemy catalogs, and deterministic authored wave schedule generation.
- 🟡 Tower Defense deep factory: visual enemy/tower catalogs, authored waves, pure first/last/strongest/weakest/nearest targeting, visual placement/bounds rules, range/damage combat resolution, pure enemy path progression, timed status effects, projectile timing/impact resolution, portable upgrade progression, and a deterministic wave simulator are generated now. Visual path/upgrade/effect authoring, replication, procedural waves, and the 100-wave dashboard remain.
- ⬜ Grid tactics factory: square/hex grids, turn order, movement, terrain, combat, effects, objectives, AI, replayable deterministic simulations.
- 🟡 Lower-level domain systems: portable cooldown and status-effect primitives are generated for Tower Defense projects. Visual authoring plus inventory, equipment, abilities, combat factories, NPC AI, quests, economy, shops, crafting, rounds, matchmaking, progression, achievements, save data, replication, and test factories remain.

## Testing, simulation, and observability

- ✅ Generator rejects malformed network message names before generation.
- ✅ Extension-host test executes Create → Validate → Generate in a real VS Code runtime and checks output files.
- 🟡 Visual state-invariant and deterministic simulation-scenario test blocks now generate into the Lute suite. Serialization, migration, network-contract, and performance tests remain.
- ⬜ Property/fuzz testing and generated invariant suites.
- 🟡 Build & Test: validates and regenerates the project, then runs available StyLua formatting, Selene analysis, Lute typechecking/tests, and a Rojo build with a truthful VS Code output report. Dependency installation, Studio sync, result-to-node linking, simulation dashboard, and canvas test authoring remain incomplete.
- 🟡 Forge can now run 1/10/100/1000 deterministic authored Tower Defense schedules and report spawned/defeated/leaked/reward totals in the Build & Test output. Seeds, replay, charts, distributions, and failed-invariant drilldown remain.
- ⬜ Visual debugging: timeline, event traces, entity inspector, component diffs, network/save traces, and system order.

## Release sequence

| Milestone | Outcome | Status |
| --- | --- | --- |
| v0.1 Foundation | Editable graph canvas, robust visual-definition model, safe generation, project explorer | 🟡 started |
| v0.2 Toolchain & Simulation | Wally/Rojo/StyLua/Selene/Lute runners and useful feedback panel | ⬜ planned |
| v0.3 Factories & Persistence | Deep Tower Defense, Tactics, JECS/Lync/Lyra integrations | ⬜ planned |
| v0.4 Observability | Sim dashboard, replay, visual debugger, factory authoring | ⬜ planned |

## Verification standard

Every milestone must add automated proof at the lowest sensible layer:

1. pure generator/domain tests;
2. extension-host integration tests for VS Code behavior;
3. toolchain fixture tests for generated Roblox/Luau projects;
4. Studio-only tests only where a Roblox adapter genuinely requires Studio.
