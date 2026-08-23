import { describe, expect, it } from "vitest";

import { SECTIONS, groupBySection, sectionFor } from "@/lib/grocery-sections";

describe("sectionFor", () => {
  describe("the sections a shopper actually walks", () => {
    it.each([
      ["Chicken breast", "meat"],
      ["salmon fillet", "meat"],
      ["Streaky bacon", "meat"],
      ["prawns", "meat"],
      ["Cheddar cheese", "dairy"],
      ["Greek yoghurt", "dairy"],
      ["large eggs", "dairy"],
      ["Ground cumin", "spice"],
      ["smoked paprika", "spice"],
      ["bay leaves", "spice"],
      ["Basmati rice", "starch"],
      ["dried spaghetti", "starch"],
      ["Potatoes", "starch"],
      ["Yellow onion", "produce"],
      ["Fresh parsley", "produce"],
      ["asparagus", "produce"],
      ["Sourdough loaf", "bakery"],
      ["Olive oil", "pantry"],
      ["frozen peas", "frozen"],
    ] as const)("puts %s with the %s", (name, section) => {
      expect(sectionFor(name)).toBe(section);
    });
  });

  describe("words that mean two different aisles", () => {
    it("separates the bird from the tin", () => {
      // The failure that would matter: sending someone to the butcher for
      // stock, or to the tinned aisle for a chicken.
      expect(sectionFor("chicken thighs")).toBe("meat");
      expect(sectionFor("chicken stock")).toBe("pantry");
      expect(sectionFor("beef brisket")).toBe("meat");
      expect(sectionFor("beef broth")).toBe("pantry");
    });

    it("separates dairy butter from nut butter", () => {
      expect(sectionFor("unsalted butter")).toBe("dairy");
      expect(sectionFor("peanut butter")).toBe("pantry");
      expect(sectionFor("almond butter")).toBe("pantry");
    });

    it("separates milk from the things called milk", () => {
      expect(sectionFor("whole milk")).toBe("dairy");
      expect(sectionFor("coconut milk")).toBe("pantry");
      expect(sectionFor("oat milk")).toBe("pantry");
    });

    it("separates fresh tomatoes from tinned and dried", () => {
      expect(sectionFor("ripe tomatoes")).toBe("produce");
      expect(sectionFor("tomato paste")).toBe("pantry");
      expect(sectionFor("sun dried tomatoes")).toBe("pantry");
      expect(sectionFor("crushed tomatoes")).toBe("pantry");
    });

    it("sends the dried form of a fresh thing to the spices", () => {
      expect(sectionFor("garlic")).toBe("produce");
      expect(sectionFor("garlic powder")).toBe("spice");
      expect(sectionFor("fresh oregano")).toBe("spice");
      expect(sectionFor("dried oregano")).toBe("spice");
    });
  });

  describe("whole words only", () => {
    it("does not let a short word claim a longer one", () => {
      // "pea" inside "peanut" and "corn" inside "cornstarch" are the two that
      // bite, and both would file a pantry item under produce.
      expect(sectionFor("peanuts")).toBe("pantry");
      expect(sectionFor("cornstarch")).toBe("pantry");
      expect(sectionFor("garden peas")).toBe("produce");
      expect(sectionFor("sweetcorn")).toBe("other");
    });
  });

  describe("plurals and punctuation", () => {
    it.each([
      ["carrot", "carrots"],
      ["egg", "eggs"],
      ["potato", "potatoes"],
      ["bay leaf", "bay leaves"],
    ])("treats %s and %s the same", (singular, plural) => {
      expect(sectionFor(singular)).toBe(sectionFor(plural));
    });

    it("copes with hyphens and capitals", () => {
      expect(sectionFor("Sun-Dried Tomatoes")).toBe("pantry");
      expect(sectionFor("SPRING ONIONS")).toBe("produce");
    });
  });

  describe("what it does not know", () => {
    it("files the unrecognised rather than guessing", () => {
      // A wrong aisle sends someone to the far side of the shop. "I do not
      // know" is a more useful answer than a confident mistake.
      expect(sectionFor("kohlrabi")).toBe("other");
      expect(sectionFor("")).toBe("other");
      expect(sectionFor("   ")).toBe("other");
    });
  });
});

describe("groupBySection", () => {
  const list = [
    { name: "Chicken thighs" },
    { name: "Basmati rice" },
    { name: "Yellow onion" },
    { name: "Ground cumin" },
    { name: "Cheddar" },
    { name: "kohlrabi" },
  ];

  it("orders the aisles as the shop is laid out", () => {
    expect(groupBySection(list).map((g) => g.id)).toEqual([
      "produce",
      "meat",
      "dairy",
      "starch",
      "spice",
      "other",
    ]);
  });

  it("leaves out sections with nothing in them", () => {
    const groups = groupBySection([{ name: "Chicken thighs" }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("meat");
  });

  it("keeps every item, losing none to grouping", () => {
    const grouped = groupBySection(list).flatMap((g) => g.items);
    expect(grouped).toHaveLength(list.length);
    expect(new Set(grouped.map((i) => i.name))).toEqual(
      new Set(list.map((i) => i.name)),
    );
  });

  it("puts what it cannot place last, not first", () => {
    const groups = groupBySection(list);
    expect(groups[groups.length - 1].id).toBe("other");
  });

  it("preserves the order items arrived in within a section", () => {
    const groups = groupBySection([
      { name: "Salmon" },
      { name: "Bacon" },
      { name: "Prawns" },
    ]);
    expect(groups[0].items.map((i) => i.name)).toEqual([
      "Salmon",
      "Bacon",
      "Prawns",
    ]);
  });

  it("handles an empty list", () => {
    expect(groupBySection([])).toEqual([]);
  });

  it("labels every section it can produce", () => {
    // A section with an id and no label renders as a blank heading.
    for (const section of SECTIONS) {
      expect(section.label.trim().length).toBeGreaterThan(0);
    }
  });
});
