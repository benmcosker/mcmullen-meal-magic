import { normaliseName } from "./grocery";
import { sectionFor } from "./grocery-sections";
import { SIDES, type SideDefinition } from "./sides";

/**
 * Choosing what goes beside the main, from what the app already knows.
 *
 * No model involved. Everything below is a fact already stored against the
 * recipe - its oven temperature, its equipment, what is in it - and a model
 * would be guessing at exactly the things a lookup can answer. It also cannot
 * know what is in this household's pantry, which is the signal that makes a
 * suggestion feel like it was made for you.
 */

export type MainDish = {
  title: string;
  ovenTemp: number | null;
  ovenTempUnit: "FAHRENHEIT" | "CELSIUS" | null;
  equipment: string[];
  ingredients: { name: string }[];
};

export type SideSuggestion = {
  side: SideDefinition;
  score: number;
  /** Why it was put forward, in words, so the suggestion is not a black box. */
  reasons: string[];
};

/** Close enough to share an oven without either dish suffering. */
const OVEN_TOLERANCE_F = 25;

function toFahrenheit(temp: number, unit: "FAHRENHEIT" | "CELSIUS"): number {
  return unit === "FAHRENHEIT" ? temp : temp * 1.8 + 32;
}

/** Whether the main is already carrying the starch. */
function mainIsStarchy(main: MainDish): boolean {
  return main.ingredients.some(
    (i) => sectionFor(normaliseName(i.name)) === "starch",
  );
}

/**
 * Equipment a kitchen has more than one of, or can share without either dish
 * waiting.
 *
 * The distinction matters more than it looks. Penalising every shared item
 * marked a roast side as conflicting with a roast main, which is precisely the
 * pairing the oven matching exists to find - two trays, one oven, both in at
 * once. A skillet is genuinely one-at-a-time; a baking tray is not.
 */
const NOT_SCARCE = new Set(["sheet pan", "baking sheet", "baking dish"]);

function sharesEquipment(side: SideDefinition, main: MainDish): boolean {
  const wanted = new Set(main.equipment.map((e) => e.trim().toLowerCase()));
  return side.equipment.some((e) => {
    const name = e.trim().toLowerCase();
    return wanted.has(name) && !NOT_SCARCE.has(name);
  });
}

/**
 * Rank the catalogue against one main, best first.
 *
 * `pantry` is the household's staples, normalised. A side leaning on what is
 * already in the cupboard is worth more than one that adds four things to the
 * shopping.
 */
export function suggestSides(
  main: MainDish,
  pantry: string[] = [],
  limit = 3,
): SideSuggestion[] {
  const staples = new Set(pantry.map(normaliseName));
  const starchyMain = mainIsStarchy(main);
  const mainOven =
    main.ovenTemp != null && main.ovenTempUnit != null
      ? toFahrenheit(main.ovenTemp, main.ovenTempUnit)
      : null;

  const scored = SIDES.map((side) => {
    const reasons: string[] = [];
    let score = 0;

    // The strongest signal by a distance: both trays go in the same oven at
    // the same temperature, which is the difference between a side that costs
    // nothing and one that means watching a second thing.
    if (mainOven != null && side.ovenTemp != null && side.ovenTempUnit) {
      const sideOven = toFahrenheit(side.ovenTemp, side.ovenTempUnit);
      if (Math.abs(sideOven - mainOven) <= OVEN_TOLERANCE_F) {
        score += 5;
        reasons.push(`Roasts alongside at ${Math.round(mainOven)}F`);
      }
    } else if (mainOven == null && side.ovenTemp == null) {
      // Nothing is using the oven, so a stovetop side keeps it that way.
      score += 1;
    }

    // A second thing wanting the skillet the main is in means one of them
    // waits.
    if (sharesEquipment(side, main)) {
      score -= 3;
      reasons.push(`Wants the ${side.equipment[0].toLowerCase()} as well`);
    }

    // Pasta beside rice is two starches and no vegetable.
    if (starchyMain && side.kind === "starch") {
      score -= 4;
    } else if (
      starchyMain &&
      (side.kind === "vegetable" || side.kind === "salad")
    ) {
      score += 3;
      reasons.push("Balances a starchy main");
    }

    // How much of it is already in the cupboard.
    const covered = side.ingredients.filter((i) =>
      staples.has(normaliseName(i.name)),
    ).length;
    if (covered > 0) {
      score += covered;
      const missing = side.ingredients.length - covered;
      reasons.push(
        missing === 0
          ? "You have everything for it"
          : `You have ${covered} of ${side.ingredients.length} ingredients`,
      );
    }

    // A twenty-minute side beside a forty-minute main is easier than two long
    // jobs, so quicker wins ties.
    score += Math.max(
      0,
      3 - Math.floor((side.prepMinutes + side.cookMinutes) / 15),
    );

    return { side, score, reasons };
  });

  return scored
    .sort(
      (a, b) => b.score - a.score || a.side.title.localeCompare(b.side.title),
    )
    .slice(0, limit);
}
