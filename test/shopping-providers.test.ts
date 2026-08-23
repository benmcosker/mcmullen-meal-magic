import { afterEach, describe, expect, it } from "vitest";

import {
  amazonFreshProvider,
  buildSearchUrl,
  buildStoreUrl,
  wholeFoodsProvider,
} from "@/lib/shopping/amazon";
import {
  formatAmount,
  formatAsPlainText,
  getProvider,
  listProviders,
  listUsableProviders,
} from "@/lib/shopping";
import type { GroceryLine } from "@/lib/grocery";

const lines: GroceryLine[] = [
  {
    name: "chicken breast",
    quantity: 2,
    unit: "lb",
    fromRecipes: ["Piccata"],
    recipeId: "r1",
  },
  {
    name: "salt",
    quantity: null,
    unit: null,
    fromRecipes: ["Piccata"],
    recipeId: "r1",
  },
];

describe("buildSearchUrl", () => {
  it("scopes the search to the Amazon Fresh storefront", () => {
    const url = new URL(buildSearchUrl("butter", "AMAZON_FRESH"));
    expect(url.origin + url.pathname).toBe("https://www.amazon.com/s");
    expect(url.searchParams.get("k")).toBe("butter");
    expect(url.searchParams.get("i")).toBe("amazonfresh");
  });

  it("scopes the search to the Whole Foods storefront", () => {
    const url = new URL(buildSearchUrl("butter", "WHOLE_FOODS"));
    expect(url.searchParams.get("i")).toBe("wholefoods");
  });

  it("encodes names that would otherwise break the query string", () => {
    const url = new URL(buildSearchUrl("salt & pepper", "AMAZON_FRESH"));
    // Round-trips rather than splitting the query on the ampersand.
    expect(url.searchParams.get("k")).toBe("salt & pepper");
    expect(url.searchParams.get("i")).toBe("amazonfresh");
  });

  it("searches the ingredient only, not the amount", () => {
    // "2 tbsp butter" as a search term matches far worse than "butter".
    const url = new URL(buildSearchUrl("  butter  ", "AMAZON_FRESH"));
    expect(url.searchParams.get("k")).toBe("butter");
  });
});

describe("buildStoreUrl", () => {
  it("points at the right storefront", () => {
    expect(new URL(buildStoreUrl("WHOLE_FOODS")).searchParams.get("i")).toBe(
      "wholefoods",
    );
  });
});

describe("amazon provider handoff", () => {
  it("returns links rather than claiming to have built a cart", async () => {
    const result = await amazonFreshProvider.handoff(lines, new Date());
    expect(result.ok).toBe(true);
    expect(result.ok && result.kind).toBe("links");
  });

  it("produces one link per ingredient", async () => {
    const result = await amazonFreshProvider.handoff(lines, new Date());
    if (!result.ok || result.kind !== "links")
      throw new Error("expected links");

    expect(result.lines.map((l) => l.name)).toEqual(["chicken breast", "salt"]);
    expect(result.lines[0].amount).toBe("2 lb");
    expect(result.lines[1].amount).toBe("");
  });

  it("includes a pasteable text list", async () => {
    const result = await amazonFreshProvider.handoff(lines, new Date());
    if (!result.ok || result.kind !== "links")
      throw new Error("expected links");
    expect(result.text).toBe("2 lb chicken breast\nsalt");
  });

  it("refuses an empty list", async () => {
    const result = await amazonFreshProvider.handoff([], new Date());
    expect(result.ok).toBe(false);
  });

  it("needs no configuration to be usable", () => {
    expect(amazonFreshProvider.info().available).toBe(true);
    expect(wholeFoodsProvider.info().available).toBe(true);
  });

  it("declares itself a link provider, not a cart provider", () => {
    expect(amazonFreshProvider.info().kind).toBe("links");
    expect(wholeFoodsProvider.info().kind).toBe("links");
  });
});

describe("listProviders", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("lists the shops that work before the one that cannot", () => {
    // Instacart builds a real cart and would otherwise lead, but it cannot be
    // enabled at all right now; listing it first implies the others are a
    // fallback rather than the only working path.
    expect(listProviders().map((p) => p.id)).toEqual([
      "AMAZON_FRESH",
      "WHOLE_FOODS",
      "INSTACART",
    ]);
  });

  it("marks Instacart unavailable and explains that no key can be had", () => {
    delete process.env.INSTACART_API_KEY;
    const instacart = listProviders().find((p) => p.id === "INSTACART")!;
    expect(instacart.available).toBe(false);
    expect(instacart.unavailableReason).toMatch(
      /closed new developer applications/i,
    );
    // Says the integration survives, so nobody assumes it needs rebuilding.
    expect(instacart.unavailableReason).toMatch(/built/i);
  });

  it("marks Instacart available once a key is configured", () => {
    process.env.INSTACART_API_KEY = "k";
    expect(listProviders().find((p) => p.id === "INSTACART")!.available).toBe(
      true,
    );
  });

  it("keeps Amazon usable even when Instacart is not configured", () => {
    delete process.env.INSTACART_API_KEY;
    const amazon = listProviders().filter((p) => p.id !== "INSTACART");
    expect(amazon.every((p) => p.available)).toBe(true);
  });
});

describe("what the planner is offered", () => {
  it("leaves Instacart out entirely while no key exists", () => {
    // Not hidden because it is Instacart - hidden because it cannot do
    // anything. A greyed-out button above a sentence explaining that it will
    // never work is a notice, not an option, and it would sit on the page
    // every week saying the same thing.
    delete process.env.INSTACART_API_KEY;
    expect(listUsableProviders().map((p) => p.id)).toEqual([
      "AMAZON_FRESH",
      "WHOLE_FOODS",
    ]);
  });

  it("brings it back on its own the day a key is set", () => {
    // The point of filtering on `available` rather than naming Instacart: no
    // code change is needed when applications reopen.
    process.env.INSTACART_API_KEY = "k";
    expect(listUsableProviders().map((p) => p.id)).toContain("INSTACART");
  });

  it("keeps the registry complete either way", () => {
    // Hiding it from the UI must not unregister it, or the handoff route
    // would fail to find the adapter for a provider it was asked to use.
    delete process.env.INSTACART_API_KEY;
    expect(listProviders().map((p) => p.id)).toContain("INSTACART");
    expect(getProvider("INSTACART")).toBeDefined();
  });

  it("offers every provider it lists as usable", () => {
    delete process.env.INSTACART_API_KEY;
    expect(listUsableProviders().every((p) => p.available)).toBe(true);
  });
});

describe("formatting", () => {
  it("renders amounts with and without units", () => {
    expect(formatAmount(lines[0])).toBe("2 lb");
    expect(formatAmount(lines[1])).toBe("");
    expect(formatAmount({ ...lines[0], unit: null, quantity: 3 })).toBe("3");
  });

  it("renders a plain-text list one item per line", () => {
    expect(formatAsPlainText(lines).split("\n")).toHaveLength(2);
  });
});
