import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// A placeholder suite so `npm test` and CI have something real to run before
// any features exist. Replace once there is application code to cover.
describe("prisma schema", () => {
  const schema = readFileSync(
    join(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );

  it("declares the models the app is planned around", () => {
    for (const model of [
      "Recipe",
      "Ingredient",
      "PlannedMeal",
      "GroceryItem",
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("keeps the generated client inside src/ so the @/ alias resolves it", () => {
    expect(schema).toContain('output   = "../src/generated/prisma"');
  });
});
