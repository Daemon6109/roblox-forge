# Roblox Forge

**Roblox Forge** is a local-first VS Code extension for visually defining Roblox game systems and generating normal, editable Luau underneath.

## First vertical slice

The initial extension provides a systems canvas plus commands to create a diffable `.forge/tower-defense.json` definition, validate it, then generate:

- pure-domain Luau designed to run under Lute;
- typed networking contract stubs for Lync;
- Rojo project mapping;
- Wally manifest;
- a domain test skeleton.

This proves the core ownership rule: **the visual definition is source, generated code is real code, and nothing is trapped in a binary editor file.**

## Run locally

```sh
npm install
npm run package
```

Open the folder in VS Code, press `F5`, then use the command palette:

1. Open the **Roblox Forge** activity-bar icon to see the architecture canvas.
2. `Roblox Forge: Create Tower Defense Definition`
2. `Roblox Forge: Validate Definition`
3. `Roblox Forge: Generate Luau Project`

## Design boundaries

- **Pure domain:** combat, waves, economy, targeting, and state transitions.
- **Roblox adapters:** Instances, Players, remotes, rendering, sound, DataStores.
- **Tooling:** graph definitions, generation, dependency management, formatting, linting, Lute runs, and diagnostics.

JECS, Lync, Lyra, Rojo, Wally, StyLua, Selene, and Lute will be integrated only where each tool belongs; this first slice establishes the generated-project contract before adding their process runners.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the complete delivered/partial/not-built checklist and verification standard. The public [GitHub Project](https://github.com/users/Daemon6109/projects/12) tracks implementation issues.

1. Graph webview for components, systems, schemas, and pipelines.
2. Wally package browser and pinned, compatibility-tested dependency sets.
3. Lute/StyLua/Selene/Rojo orchestration with clickable diagnostics.
4. Tower Defense factory simulation dashboard.
5. Grid-tactics factory and migration editor for Lyra persistence.

## Quality gate

Every push runs `npm ci`, `npm run package`, and a real VS Code Extension Development Host test in GitHub Actions. The integration test executes the three commands against a temporary workspace, then verifies the generated Luau and Rojo project files. This follows VS Code's official extension-host test setup. [VS Code testing docs](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
