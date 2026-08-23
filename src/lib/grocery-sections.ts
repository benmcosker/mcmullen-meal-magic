/**
 * Which part of the shop an ingredient comes from.
 *
 * A shopping list in one alphabetical run means walking the shop backwards:
 * flour, then lamb, then lemons, then milk. Grouping it into aisles turns the
 * list into a route.
 *
 * Ordered as a supermarket is usually laid out - produce at the entrance,
 * chilled goods round the edge, dry goods in the middle - so working down the
 * list works round the shop.
 */
export const SECTIONS = [
  { id: "produce", label: "Produce" },
  { id: "meat", label: "Meat & fish" },
  { id: "dairy", label: "Dairy, cheese & eggs" },
  { id: "bakery", label: "Bakery" },
  { id: "starch", label: "Starches & grains" },
  { id: "pantry", label: "Pantry" },
  { id: "spice", label: "Spices & seasoning" },
  { id: "frozen", label: "Frozen" },
  // Never dropped, never silently mis-filed. An ingredient nothing recognises
  // still has to be bought, and a list that quietly loses one is worse than a
  // list with an untidy heading at the bottom.
  { id: "other", label: "Everything else" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

type Rule = { section: SectionId; phrases: string[] };

/**
 * Matched in order, first hit wins, so the exceptions come first.
 *
 * The whole difficulty here is that the same word means different aisles:
 * chicken is meat but chicken stock is a tin, butter is dairy but peanut
 * butter is not, tomatoes are produce but sun-dried tomatoes are a jar. Each
 * of those is a phrase that has to be checked before the word it contains.
 */
const RULES: Rule[] = [
  {
    // Things named after an aisle they do not belong to.
    section: "pantry",
    phrases: [
      "chicken stock",
      "chicken broth",
      "beef stock",
      "beef broth",
      "fish stock",
      "fish sauce",
      "vegetable stock",
      "vegetable broth",
      "bone broth",
      "peanut butter",
      "almond butter",
      "nut butter",
      "coconut milk",
      "coconut cream",
      "almond milk",
      "oat milk",
      "soy milk",
      "sun dried tomato",
      "sundried tomato",
      "tomato paste",
      "tomato puree",
      "canned tomato",
      "tinned tomato",
      "crushed tomato",
      "diced tomato",
      "apple sauce",
      "applesauce",
      "corn syrup",
      "cream of tartar",
    ],
  },
  {
    // Before produce and meat, or "frozen peas" is filed with the fresh peas
    // and "frozen prawns" with the fish counter.
    section: "frozen",
    phrases: ["frozen", "ice cream", "sorbet"],
  },
  {
    section: "spice",
    phrases: [
      // Any powdered or dried form of a fresh thing lives with the spices.
      // "dried" is deliberately absent: dried pasta, dried beans and dried
      // fruit are not spices, and it claimed all of them. The dried form of a
      // herb is caught by the herb's own name below.
      "powder",
      "ground",
      "flakes",
      "seasoning",
      "extract",
      "salt",
      "pepper",
      "peppercorn",
      "paprika",
      "cumin",
      "coriander seed",
      "turmeric",
      "cinnamon",
      "nutmeg",
      "clove",
      "cardamom",
      "oregano",
      "thyme",
      "rosemary",
      "sage",
      "bay leaf",
      "bay leaves",
      "chilli",
      "chili",
      "cayenne",
      "curry",
      "garam masala",
      "za atar",
      "sumac",
      "vanilla",
      "saffron",
      "allspice",
      "mustard seed",
      "fennel seed",
      "sesame seed",
      "yeast",
      "baking powder",
      "baking soda",
    ],
  },
  {
    section: "meat",
    phrases: [
      "chicken",
      "beef",
      "pork",
      "lamb",
      "veal",
      "turkey",
      "duck",
      "goose",
      "bacon",
      "sausage",
      "chorizo",
      "pancetta",
      "prosciutto",
      "ham",
      "salami",
      "mince",
      "steak",
      "brisket",
      "ribs",
      "thigh",
      "drumstick",
      "cutlet",
      "tenderloin",
      "fish",
      "salmon",
      "tuna",
      "cod",
      "haddock",
      "halibut",
      "trout",
      "sardine",
      "anchovy",
      "anchovies",
      "prawn",
      "shrimp",
      "crab",
      "lobster",
      "scallop",
      "mussel",
      "clam",
      "squid",
      "octopus",
      "calamari",
    ],
  },
  {
    section: "dairy",
    phrases: [
      "milk",
      "cream",
      "butter",
      "cheese",
      "cheddar",
      "parmesan",
      "parmigiano",
      "mozzarella",
      "feta",
      "ricotta",
      "mascarpone",
      "gruyere",
      "brie",
      "halloumi",
      "goat cheese",
      "cream cheese",
      "yoghurt",
      "yogurt",
      "creme fraiche",
      "sour cream",
      "egg",
      "eggs",
      "buttermilk",
      "ghee",
    ],
  },
  {
    section: "bakery",
    phrases: [
      "bread",
      "baguette",
      "ciabatta",
      "sourdough",
      "roll",
      "bun",
      "pitta",
      "pita",
      "naan",
      "tortilla",
      "brioche",
      "croissant",
      "focaccia",
      "breadcrumb",
      "panko",
    ],
  },
  {
    section: "starch",
    phrases: [
      "flour",
      "rice",
      "pasta",
      "spaghetti",
      "penne",
      "linguine",
      "tagliatelle",
      "macaroni",
      "fusilli",
      "orzo",
      "lasagne",
      "lasagna",
      "noodle",
      "couscous",
      "quinoa",
      "barley",
      "bulgur",
      "polenta",
      "oats",
      "oatmeal",
      "potato",
      "potatoes",
      "sweet potato",
      "gnocchi",
      "tortellini",
      "ravioli",
      "cornmeal",
      "semolina",
    ],
  },
  {
    section: "produce",
    phrases: [
      "onion",
      "shallot",
      "garlic",
      "leek",
      "celery",
      "carrot",
      "parsnip",
      "turnip",
      "swede",
      "beetroot",
      "radish",
      "tomato",
      "cucumber",
      "pepper",
      "capsicum",
      "aubergine",
      "eggplant",
      "courgette",
      "zucchini",
      "squash",
      "pumpkin",
      "broccoli",
      "cauliflower",
      "cabbage",
      "kale",
      "spinach",
      "lettuce",
      "rocket",
      "arugula",
      "chard",
      "pea",
      "peas",
      "bean",
      "beans",
      "asparagus",
      "artichoke",
      "mushroom",
      "corn",
      "avocado",
      "lemon",
      "lime",
      "orange",
      "apple",
      "pear",
      "banana",
      "berry",
      "berries",
      "strawberry",
      "raspberry",
      "blueberry",
      "grape",
      "peach",
      "plum",
      "mango",
      "pineapple",
      "melon",
      "cherry",
      "fig",
      "date",
      "parsley",
      "basil",
      "cilantro",
      "coriander",
      "mint",
      "dill",
      "chive",
      "tarragon",
      "ginger",
      "lemongrass",
      "spring onion",
      "scallion",
    ],
  },
  {
    section: "pantry",
    phrases: [
      "oil",
      "vinegar",
      "sugar",
      "honey",
      "syrup",
      "molasses",
      "jam",
      "preserve",
      "mustard",
      "ketchup",
      "mayonnaise",
      "mayo",
      "soy sauce",
      "worcestershire",
      "hot sauce",
      "sriracha",
      "tahini",
      "miso",
      "stock",
      "broth",
      "bouillon",
      "lentil",
      "chickpea",
      "canned",
      "tinned",
      "tin of",
      "can of",
      "jar",
      "nut",
      "nuts",
      "peanut",
      "almond",
      "walnut",
      "pecan",
      "cashew",
      "pistachio",
      "hazelnut",
      "pine nut",
      "raisin",
      "sultana",
      "chocolate",
      "cocoa",
      "wine",
      "stock cube",
      "olive",
      "caper",
      "gelatin",
      "cornstarch",
      "cornflour",
      "arrowroot",
    ],
  },
];

/**
 * Which aisle this ingredient belongs to.
 *
 * Matching is on whole words, so "pea" does not claim "peanut" and "corn"
 * does not claim "cornstarch"; each of those has its own entry where it
 * matters. Anything unrecognised lands in "other" rather than being guessed
 * at - a wrong aisle sends someone to the far side of the shop.
 */
export function sectionFor(name: string): SectionId {
  const words = normalise(name);
  if (words.length === 0) return "other";

  const haystack = ` ${words.join(" ")} `;

  for (const rule of NORMALISED_RULES) {
    for (const phrase of rule.phrases) {
      if (haystack.includes(phrase)) return rule.section;
    }
  }

  return "other";
}

/**
 * The phrase list, put through the same normalisation as the ingredient.
 *
 * Without this, every phrase written as a plural is unmatchable: the
 * ingredient "asparagus" is folded to "asparagu" while the phrase stays
 * "asparagus", so they never meet. Normalising both sides means the list can
 * be written in whatever form reads naturally.
 *
 * Done once at module load rather than per ingredient, since the rules never
 * change and a week's list runs this a few dozen times.
 */
const NORMALISED_RULES = RULES.map((rule) => ({
  section: rule.section,
  // Space-padded so matching is on whole words: "pea" must not claim "peanut",
  // and "corn" must not claim "cornstarch".
  phrases: rule.phrases.map((phrase) => ` ${normalise(phrase).join(" ")} `),
}));

/**
 * Lower-case, punctuation stripped, plurals folded.
 *
 * The plural rule is crude - drop a trailing "s" on anything long enough,
 * unless it ends in "ss" - but it is applied to the phrase list and the
 * ingredient alike, so both sides agree and "carrots" finds "carrot".
 */
function normalise(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map(stem);
}

/**
 * Fold a plural to the same stem its singular produces.
 *
 * "tomatoes" has to reach "tomato", not "tomatoe", or it never meets the
 * phrase it is meant to match - which is what sent fresh tomatoes to the
 * unrecognised pile. Correct English stemming is not the goal; agreeing with
 * itself is, since both the ingredient and the phrase list go through here.
 */
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (/(?:o|s|x|ch|sh|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export type Sectioned<T> = { id: SectionId; label: string; items: T[] };

/**
 * Split a shopping list into aisles, in shop order.
 *
 * Empty sections are dropped: a heading with nothing under it is a heading you
 * read, check, and discard on every trip.
 */
export function groupBySection<T extends { name: string }>(
  items: T[],
): Sectioned<T>[] {
  const buckets = new Map<SectionId, T[]>();

  for (const item of items) {
    const id = sectionFor(item.name);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(item);
    else buckets.set(id, [item]);
  }

  return SECTIONS.filter((section) => buckets.has(section.id)).map(
    (section) => ({
      id: section.id,
      label: section.label,
      items: buckets.get(section.id)!,
    }),
  );
}
