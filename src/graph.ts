import type { SimulationBlock, TowerDefenseDefinition } from "./model";

const positionOrder = (left: SimulationBlock, right: SimulationBlock) => left.position.y - right.position.y || left.position.x - right.position.x || left.id.localeCompare(right.id);

/** Deterministic topological order used by both validation and code generation. */
export function scheduleBlocks(definition: TowerDefenseDefinition): SimulationBlock[] {
  const blocks = definition.flow.filter((block) => block.enabled);
  const known = new Map(blocks.map((block) => [block.id, block]));
  const incoming = new Map(blocks.map((block) => [block.id, 0]));
  const outgoing = new Map(blocks.map((block) => [block.id, [] as string[]]));
  for (const edge of definition.connections) {
    if (known.has(edge.from) && known.has(edge.to)) {
      outgoing.get(edge.from)?.push(edge.to);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }
  }
  const ready = blocks.filter((block) => incoming.get(block.id) === 0).sort(positionOrder);
  const order: SimulationBlock[] = [];
  while (ready.length) {
    const block = ready.shift()!;
    order.push(block);
    for (const destination of outgoing.get(block.id) ?? []) {
      const remaining = (incoming.get(destination) ?? 1) - 1;
      incoming.set(destination, remaining);
      if (remaining === 0) ready.push(known.get(destination)!);
    }
    ready.sort(positionOrder);
  }
  return order;
}

export function graphDiagnostics(definition: TowerDefenseDefinition): string[] {
  const ids = new Set(definition.flow.map((block) => block.id));
  const messages: string[] = [];
  const inputCounts = new Map<string, number>();
  const outputCounts = new Map<string, number>();
  for (const edge of definition.connections) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) messages.push("A graph connection points to a missing block.");
    if (edge.from === edge.to) messages.push("A block cannot connect to itself.");
    inputCounts.set(edge.to, (inputCounts.get(edge.to) ?? 0) + 1);
    outputCounts.set(edge.from, (outputCounts.get(edge.from) ?? 0) + 1);
  }
  if ([...inputCounts.values()].some((count) => count > 1)) messages.push("This first graph runtime supports one execution input per block.");
  if ([...outputCounts.values()].some((count) => count > 1)) messages.push("This first graph runtime supports one execution output per block.");
  if (scheduleBlocks(definition).length !== definition.flow.filter((block) => block.enabled).length) messages.push("The enabled simulation graph contains an execution cycle.");
  return [...new Set(messages)];
}
