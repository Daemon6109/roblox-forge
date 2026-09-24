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
  const schemas = new Set<string>();
  for (const schema of definition.schemas) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(schema.name)) diagnostics.push({ path: `schemas.${schema.id}`, message: "Schema names must be PascalCase." });
    if (schemas.has(schema.name)) diagnostics.push({ path: `schemas.${schema.id}`, message: "Schema names must be unique." });
    schemas.add(schema.name);
    if (!schema.fields.length) diagnostics.push({ path: `schemas.${schema.id}`, message: "Schemas need at least one field." });
    const fields = new Set<string>();
    for (const field of schema.fields) {
      if (!/^[a-z][A-Za-z0-9]*$/.test(field.name)) diagnostics.push({ path: `schemas.${schema.id}.${field.name}`, message: "Schema field names must be camelCase." });
      if (fields.has(field.name)) diagnostics.push({ path: `schemas.${schema.id}.${field.name}`, message: "Schema field names must be unique." });
      fields.add(field.name);
    }
  }
  const schemaIds = new Set(definition.schemas.map((schema) => schema.id));
  for (const block of definition.flow) {
    if (block.bindings.some((binding) => !schemaIds.has(binding))) diagnostics.push({ path: `flow.${block.id}.bindings`, message: "A system binding points to a missing schema." });
  }
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
  const testNames = new Set<string>();
  const testIds = new Set<string>();
  for (const test of definition.tests) {
    if (!test.id || testIds.has(test.id)) diagnostics.push({ path: `tests.${test.id}`, message: "Visual test IDs must be unique." });
    testIds.add(test.id);
    if (!test.name.trim()) diagnostics.push({ path: `tests.${test.id}`, message: "Visual tests need a name." });
    if (testNames.has(test.name)) diagnostics.push({ path: `tests.${test.id}`, message: "Visual test names must be unique." });
    testNames.add(test.name);
    if (!Number.isFinite(test.condition.amount)) diagnostics.push({ path: `tests.${test.id}`, message: "Visual test thresholds must be finite numbers." });
  }
  const packageAliases = new Set<string>();
  const packageIds = new Set<string>();
  for (const item of definition.packages) {
    if (!item.id || packageIds.has(item.id)) diagnostics.push({ path: `packages.${item.id}`, message: "Package IDs must be unique." });
    packageIds.add(item.id);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(item.alias)) diagnostics.push({ path: `packages.${item.id}`, message: "Package aliases must be valid Luau identifiers." });
    if (packageAliases.has(item.alias)) diagnostics.push({ path: `packages.${item.id}`, message: "Package aliases must be unique." });
    packageAliases.add(item.alias);
    if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+@[^\s@]+$/.test(item.spec)) diagnostics.push({ path: `packages.${item.id}`, message: "Package specs must use Wally's scope/name@version form." });
  }
  return diagnostics;
}
