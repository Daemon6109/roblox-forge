# Roblox Forge Delivery Map

This is the source-of-truth checklist for the requested local-first visual Roblox/Luau game-development environment. It intentionally distinguishes **shipped**, **scaffolded**, and **not built**. A generated stub is not called an integration.

Legend: ✅ shipped and tested · 🟡 scaffolded/partial · ⬜ not built

## Core editor and project ownership

- ✅ VS Code extension foundation and public GitHub repository.
- 🟡 Visual systems canvas: renders the Tower Defense factory/data/system/network/output topology and persistently edits topology, economy, targeting, and network schemas. Freeform node layout and deep inspector editing are still missing.
- ✅ Transparent `.forge/tower-defense.json` visual-definition source.
- ✅ Normal generated Luau, Rojo mapping, Wally manifest, and test skeleton.
- 🟡 Generated-file ownership rule: generated files are marked as generated, but user extension regions and safe round-trip editing are not implemented.
- ⬜ Project explorer for factories, systems, components, assets, schemas, and tests.
- ⬜ Inspector/properties editor, graph drag/drop, auto-layout, undo/redo/history, snapshots, breadcrumbs, search, and command palette coverage.
- ⬜ Progressive code escape hatches: expressions/rules, custom Luau attachments, source mapping, and visual-to-code navigation.

## Architecture and code generation

- ✅ Generated project separates `src/shared/domain` from Roblox adapter destinations.
- ✅ Initial pure simulation boundary and domain test skeleton.
- 🟡 Network contract generation produces typed Luau shapes; it does not call Lync yet.
- 🟡 Tower Defense factory records topology, economy, targeting, and messages.
- ⬜ Component/entity/archetype/system/query/schedule authoring.
- ⬜ Roblox client/server adapter generation: Instances, Players, remotes, presentation, input, sounds, DataStores.
- ⬜ Factory composition, dependencies, extension points, conflict detection, extraction, and factory authoring.

## Toolchain and feedback loop

- ✅ TypeScript generator tests, extension-host test, and GitHub Actions verification.
- 🟡 Rojo configuration generation only; no `rojo build`/sync process runner.
- 🟡 Wally manifest generation only; no package search/install/update/lock validation.
- ⬜ StyLua formatting and format diagnostics.
- ⬜ Selene linting and clickable graph diagnostics.
- ⬜ Luau static analysis.
- ⬜ Lute execution, tests, typechecking, fuzzing, benchmarks, and fast feedback orchestration.
- ⬜ Unified **Build & Test** panel with clear results instead of raw terminal output.

## Gameplay integrations and factories

- ⬜ JECS integration and visual ECS authoring (components, relationships, queries, schedules).
- ⬜ Lync integration: actual typed remotes, serialization, reliability configuration, and visible request/validation/simulation/replication pipelines.
- ⬜ Lyra integration: player data schemas, defaults, validation, migrations, generated fixtures, load/unload wiring, and migration tests.
- 🟡 Tower Defense factory: initial definition/generation only.
- ⬜ Tower Defense deep factory: enemies, towers, projectiles, path progress, waves, placement, upgrades, effects, replication, authored/procedural waves, and 100-wave simulation.
- ⬜ Grid tactics factory: square/hex grids, turn order, movement, terrain, combat, effects, objectives, AI, replayable deterministic simulations.
- ⬜ Lower-level factories: inventory, equipment, abilities, cooldowns, status effects, combat, NPC AI, quests, economy, shops, crafting, rounds, matchmaking, progression, achievements, save data, replication, and test factories.

## Testing, simulation, and observability

- ✅ Generator rejects malformed network message names before generation.
- ✅ Extension-host test executes Create → Validate → Generate in a real VS Code runtime and checks output files.
- ⬜ Visual test objects: unit, scenario, invariant, serialization, migration, network contract, performance.
- ⬜ Property/fuzz testing and generated invariant suites.
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
