const regionPattern = /-- <forge:user-code id="([a-z0-9-]+)">\n([\s\S]*?)-- <\/forge:user-code>/g;

/**
 * Preserves supported hand-authored Luau regions during regeneration.
 * Only regions explicitly emitted by the new generator are retained, so stale
 * regions cannot silently attach to an unrelated generated file.
 */
export function preserveUserRegions(generated: string, existing?: string): string {
  if (!existing) return generated;
  const regions = new Map<string, string>();
  for (const match of existing.matchAll(regionPattern)) regions.set(match[1], match[2]);
  return generated.replace(regionPattern, (whole, id: string, generatedBody: string) => {
    const body = regions.get(id) ?? generatedBody;
    return `-- <forge:user-code id="${id}">\n${body}-- </forge:user-code>`;
  });
}
