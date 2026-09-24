# Roblox Forge Delivery Map

This is the source-of-truth checklist for the requested local-first visual Roblox/Luau game-development environment. It intentionally distinguishes **shipped**, **scaffolded**, and **not built**. A generated stub is not called an integration.

Legend: ✅ shipped and tested · 🟡 scaffolded/partial · ⬜ not built

## Core editor and project ownership

- ✅ VS Code extension foundation and public GitHub repository.
- 🟡 Visual systems canvas: has a project front page, factory inspector, draggable persisted block positions, typed execution wires, editable Component/Resource/Event contracts, system-to-contract bindings, visual state mutation with literal/state operands, and true/false conditional branches. General expressions, typed arbitrary data ports, loops, and reusable subgraphs are still missing.
- ✅ Transparent `.forge/tower-defense.json` visual-definition source.
- ✅ Normal generated Luau, Rojo mapping, Wally manifest, and test skeleton.
- 🟡 Generated-file ownership rule: named user-code regions in generated Luau survive regeneration; custom attachments, source mapping, and broader safe round-trip editing are not implemented.
- 🟡 Project Explorer ships factory, system, data-contract, networking, generated-code, and test navigation. Asset indexing and multi-factory project organization remain.
- 🟡 Inspector/properties editor, graph drag/drop, and session undo/redo are shipped. Auto-layout, durable history/snapshots, breadcrumbs, search, and command palette coverage remain.
- ⬜ Progressive code escape hatches: expressions/rules, custom Luau attachments, source mapping, and visual-to-code navigation.

## Architecture and code generation

- ✅ Generated project separates `src/shared/domain` from Roblox adapter destinations.
- 🟡 Pure simulation boundary: an ordered visual block pipeline now generates typed Luau state-transition functions and a typed context from bound visual data contracts; deep gameplay behavior is still factory work.
- 🟡 Network contract generation produces typed Luau shapes; it does not call Lync yet.
- 🟡 Tower Defense factory records topology, economy, targeting, and messages.
- ⬜ Component/entity/archetype/system/query/schedule authoring.
- ⬜ Roblox client/server adapter generation: Instances, Players, remotes, presentation, input, sounds, DataStores.
- ⬜ Factory composition, dependencies, extension points, conflict detection, extraction, and factory authoring.

## Toolchain and feedback loop

- ✅ TypeScript generator tests, extension-host test, and GitHub Actions verification.
- 🟡 Rojo configuration generation and a real `rojo build` runner are available through Build & Test; Studio sync/serve lifecycle is still missing.
- 🟡 Wally manifest generation plus an explicit Wally install command that writes normal package/lock state. Package search, add/remove/update UI, realm selection, and lock validation remain.
- ⬜ StyLua formatting and format diagnostics.
- ⬜ Selene linting and clickable graph diagnostics.
- ⬜ Luau static analysis.
- ⬜ Lute execution, tests, typechecking, fuzzing, benchmarks, and fast feedback orchestration.
- ⬜ Unified **Build & Test** panel with clear results instead of raw terminal output.

## Gameplay integrations and factories

- ⬜ JECS integration and visual ECS authoring (components, relationships, queries, schedules).
- ⬜ Lync integration: actual typed remotes, serialization, reliability configuration, and visible request/validation/simulation/replication pipelines.
- ⬜ Lyra integration: player data schemas, defaults, validation, migrations, generated fixtures, load/unload wiring, and migration tests.
- 🟡 Tower Defense factory: project wizard, definition/generation, and configurable simulation block pipeline.
- ⬜ Tower Defense deep factory: enemies, towers, projectiles, path progress, waves, placement, upgrades, effects, replication, authored/procedural waves, and 100-wave simulation.
- ⬜ Grid tactics factory: square/hex grids, turn order, movement, terrain, combat, effects, objectives, AI, replayable deterministic simulations.
- ⬜ Lower-level factories: inventory, equipment, abilities, cooldowns, status effects, combat, NPC AI, quests, economy, shops, crafting, rounds, matchmaking, progression, achievements, save data, replication, and test factories.

## Testing, simulation, and observability

- ✅ Generator rejects malformed network message names before generation.
- ✅ Extension-host test executes Create → Validate → Generate in a real VS Code runtime and checks output files.
- 🟡 Project definitions now carry generated invariant tests (starting with state invariants) which Forge emits into the Lute suite. Canvas test authoring plus scenario, serialization, migration, network-contract, and performance tests remain.
- ⬜ Property/fuzz testing and generated invariant suites.
- 🟡 Build & Test: validates and regenerates the project, then runs available StyLua formatting, Selene analysis, Lute typechecking/tests, and a Rojo build with a truthful VS Code output report. Dependency installation, Studio sync, result-to-node linking, simulation dashboard, and canvas test authoring remain incomplete.
- ⬜ Simulation dashboard: seeds, replays, batch runs, charts, performance distributions, failed invariants.
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
