import type { TowerDefenseDefinition } from "./model";
import { graphDiagnostics } from "./graph";

export type Diagnostic = { path: string; message: string };

export function validateDefinition(definition: TowerDefenseDefinition): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (!definition.name.trim()) diagnostics.push({ path: "name", message: "Project name is required." });
  if (!definition.targeting.length) diagnostics.push({ path: "targeting", message: "Choose at least one targeting mode." });
  if (!definition.flow.length) diagnostics.push({ path: "flow", message: "Add at least one simulation block." });
  const blockIds = new Set<string>();
  for (const block of definition.flow) {
    if (blockIds.has(block.id)) diagnostics.push({ path: `flow.${block.id}`, message: "Simulation block IDs must be unique." });
    blockIds.add(block.id);
  }
  graphDiagnostics(definition).forEach((message) => diagnostics.push({ path: "connections", message }));
  const seenMessages = new Set<string>();
  for (const message of definition.messages) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(message.name)) diagnostics.push({ path: `messages.${message.name}`, message: "Message names must be PascalCase." });
    if (seenMessages.has(message.name)) diagnostics.push({ path: `messages.${message.name}`, message: "Network message names must be unique." });
    seenMessages.add(message.name);
    const fields = new Set<string>();
    for (const field of message.fields) {
      if (!/^[a-z][A-Za-z0-9]*$/.test(field.name)) diagnostics.push({ path: `messages.${message.name}.${field.name}`, message: "Field names must be camelCase." });
      if (fields.has(field.name)) diagnostics.push({ path: `messages.${message.name}.${field.name}`, message: "Message field names must be unique." });
      fields.add(field.name);
    }
  }
  return diagnostics;
}
