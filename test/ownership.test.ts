import { describe, expect, it } from "vitest";
import { preserveUserRegions } from "../src/ownership";

describe("generated-code ownership", () => {
  it("preserves a matching named user region across regeneration", () => {
    const existing = `before\n-- <forge:user-code id="simulation-extensions">\nlocal extraDamage = 5\n-- </forge:user-code>\nafter\n`;
    const generated = `new before\n-- <forge:user-code id="simulation-extensions">\n-- default\n-- </forge:user-code>\nnew after\n`;
    expect(preserveUserRegions(generated, existing)).toContain("local extraDamage = 5");
  });

  it("does not retain stale regions the new file no longer owns", () => {
    const existing = `-- <forge:user-code id="removed-region">\nlocal lost = true\n-- </forge:user-code>`;
    expect(preserveUserRegions("generated", existing)).toBe("generated");
  });
});
