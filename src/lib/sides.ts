import type { TemperatureUnit } from "./recipe-schema";

/**
 * A short list of sides worth having beside almost anything.
 *
 * A catalogue in code, the way SUGGESTED_PANTRY_STAPLES is: nothing here
 * exists in anybody's library until they accept a suggestion, at which point
 * it becomes an ordinary recipe belonging to their household - editable,
 * rateable, and shoppable like any other. Nothing is generated, so nothing has
 * to be reviewed before it can be trusted.
 *
 * Written plainly on purpose. Roasting broccoli is a technique rather than
 * anybody's creative work, and these are deliberately the versions a household
 * already half-knows rather than somebody's signature dish.
 */

export type SideKind = "vegetable" | "salad" | "starch" | "bread";

export type SideDefinition = {
  /** Stable across edits to the wording; used to remember dismissals. */
  id: string;
  title: string;
  description: string;
  kind: SideKind;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  /** Set when it shares the oven, so it can be matched to the main's heat. */
  ovenTemp?: number;
  ovenTempUnit?: TemperatureUnit;
  /** What it occupies, so it is not suggested against a main using the same. */
  equipment: string[];
  ingredients: { name: string; quantity: number | null; unit: string | null }[];
  instructions: string[];
  tags: string[];
};

export const SIDES: SideDefinition[] = [
  {
    id: "roast-broccoli",
    title: "Roasted Broccoli",
    description: "Charred at the edges, lemon at the end.",
    kind: "vegetable",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 20,
    ovenTemp: 425,
    ovenTempUnit: "FAHRENHEIT",
    equipment: ["Sheet pan"],
    ingredients: [
      { name: "broccoli", quantity: 1, unit: "lb" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "lemon", quantity: 0.5, unit: null },
    ],
    instructions: [
      "Heat the oven to 425F.",
      "Toss the broccoli with the oil, salt and pepper.",
      "Roast 18-20 minutes, until the edges catch.",
      "Squeeze the lemon over it as it comes out.",
    ],
    tags: ["Side", "Roast"],
  },
  {
    id: "roast-carrots",
    title: "Roasted Carrots",
    description: "Sweet, blistered, barely any work.",
    kind: "vegetable",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 25,
    ovenTemp: 425,
    ovenTempUnit: "FAHRENHEIT",
    equipment: ["Sheet pan"],
    ingredients: [
      { name: "carrots", quantity: 1.5, unit: "lb" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "honey", quantity: 1, unit: "tsp" },
    ],
    instructions: [
      "Heat the oven to 425F.",
      "Halve the carrots lengthways and toss with oil, salt and pepper.",
      "Roast 22-25 minutes.",
      "Trickle the honey over while they are hot.",
    ],
    tags: ["Side", "Roast"],
  },
  {
    id: "roast-potatoes",
    title: "Crisp Roast Potatoes",
    description: "Parboiled first, which is the whole trick.",
    kind: "starch",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 40,
    ovenTemp: 425,
    ovenTempUnit: "FAHRENHEIT",
    equipment: ["Sheet pan", "Saucepan"],
    ingredients: [
      { name: "potatoes", quantity: 2, unit: "lb" },
      { name: "neutral oil", quantity: 3, unit: "tbsp" },
    ],
    instructions: [
      "Heat the oven to 425F.",
      "Cut the potatoes into chunks and boil 8 minutes, then drain well.",
      "Shake them in the dry pan to rough up the edges.",
      "Toss with oil and salt, roast 30 minutes, turning once.",
    ],
    tags: ["Side", "Roast"],
  },
  {
    id: "roast-green-beans",
    title: "Blistered Green Beans",
    description: "Hot oven, garlic at the last minute.",
    kind: "vegetable",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 15,
    ovenTemp: 450,
    ovenTempUnit: "FAHRENHEIT",
    equipment: ["Sheet pan"],
    ingredients: [
      { name: "green beans", quantity: 1, unit: "lb" },
      { name: "olive oil", quantity: 1.5, unit: "tbsp" },
      { name: "garlic", quantity: 2, unit: "cloves" },
    ],
    instructions: [
      "Heat the oven to 450F.",
      "Toss the beans with oil, salt and pepper.",
      "Roast 12 minutes, add the sliced garlic, roast 3 minutes more.",
    ],
    tags: ["Side", "Roast"],
  },
  {
    id: "roast-squash",
    title: "Roasted Squash",
    description: "Slow enough to suit a lower oven.",
    kind: "vegetable",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 35,
    ovenTemp: 375,
    ovenTempUnit: "FAHRENHEIT",
    equipment: ["Sheet pan"],
    ingredients: [
      { name: "butternut squash", quantity: 1.5, unit: "lb" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
    ],
    instructions: [
      "Heat the oven to 375F.",
      "Cube the squash and toss with oil, salt and pepper.",
      "Roast 35 minutes, turning once.",
    ],
    tags: ["Side", "Roast"],
  },
  {
    id: "green-salad",
    title: "Green Salad",
    description: "Leaves, mustard vinaigrette, nothing else.",
    kind: "salad",
    servings: 4,
    prepMinutes: 8,
    cookMinutes: 0,
    equipment: [],
    ingredients: [
      { name: "salad greens", quantity: 5, unit: "oz" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "red wine vinegar", quantity: 1, unit: "tbsp" },
      { name: "dijon mustard", quantity: 1, unit: "tsp" },
    ],
    instructions: [
      "Whisk the vinegar, mustard, salt and pepper.",
      "Whisk in the oil until it thickens.",
      "Dress the leaves just before sitting down.",
    ],
    tags: ["Side", "No cook"],
  },
  {
    id: "tomato-salad",
    title: "Tomato and Onion Salad",
    description: "Best in summer, pointless in February.",
    kind: "salad",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 0,
    equipment: [],
    ingredients: [
      { name: "tomatoes", quantity: 1.5, unit: "lb" },
      { name: "red onion", quantity: 0.5, unit: null },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "red wine vinegar", quantity: 2, unit: "tsp" },
    ],
    instructions: [
      "Slice the tomatoes thickly and the onion thinly.",
      "Salt the tomatoes and leave them 10 minutes.",
      "Dress with the oil and vinegar.",
    ],
    tags: ["Side", "No cook"],
  },
  {
    id: "cucumber-salad",
    title: "Smashed Cucumber Salad",
    description: "Cold, sharp, cuts through anything rich.",
    kind: "salad",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 0,
    equipment: [],
    ingredients: [
      { name: "cucumbers", quantity: 2, unit: null },
      { name: "rice vinegar", quantity: 2, unit: "tbsp" },
      { name: "sesame oil", quantity: 1, unit: "tsp" },
      { name: "garlic", quantity: 1, unit: "clove" },
    ],
    instructions: [
      "Smash the cucumbers with the flat of a knife, then tear into pieces.",
      "Salt them and drain 10 minutes.",
      "Toss with the vinegar, sesame oil and grated garlic.",
    ],
    tags: ["Side", "No cook"],
  },
  {
    id: "rice-pilaf",
    title: "Rice Pilaf",
    description: "Toasted first, so the grains stay separate.",
    kind: "starch",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 20,
    equipment: ["Saucepan"],
    ingredients: [
      { name: "long-grain rice", quantity: 1, unit: "cup" },
      { name: "butter", quantity: 1, unit: "tbsp" },
      { name: "stock", quantity: 1.75, unit: "cup" },
    ],
    instructions: [
      "Melt the butter and toast the rice 2 minutes.",
      "Add the stock, bring to a boil, cover and turn right down.",
      "Cook 18 minutes, then rest 5 off the heat before forking through.",
    ],
    tags: ["Side"],
  },
  {
    id: "buttered-noodles",
    title: "Buttered Egg Noodles",
    description: "The one everybody eats without complaint.",
    kind: "starch",
    servings: 4,
    prepMinutes: 2,
    cookMinutes: 10,
    equipment: ["Large pot"],
    ingredients: [
      { name: "egg noodles", quantity: 8, unit: "oz" },
      { name: "butter", quantity: 2, unit: "tbsp" },
      { name: "parsley", quantity: 2, unit: "tbsp" },
    ],
    instructions: [
      "Boil the noodles in well-salted water.",
      "Drain, keeping a splash of the water.",
      "Toss with the butter, the splash of water and the parsley.",
    ],
    tags: ["Side", "Quick"],
  },
  {
    id: "mashed-potatoes",
    title: "Mashed Potatoes",
    description: "Warm the milk, or it seizes.",
    kind: "starch",
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 25,
    equipment: ["Large pot"],
    ingredients: [
      { name: "potatoes", quantity: 2, unit: "lb" },
      { name: "butter", quantity: 4, unit: "tbsp" },
      { name: "milk", quantity: 0.5, unit: "cup" },
    ],
    instructions: [
      "Boil the peeled potatoes until a knife slides through, about 20 minutes.",
      "Warm the milk and butter together.",
      "Drain, mash, then beat the warm milk through.",
    ],
    tags: ["Side"],
  },
  {
    id: "couscous",
    title: "Herbed Couscous",
    description: "Five minutes, most of it waiting.",
    kind: "starch",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 5,
    equipment: [],
    ingredients: [
      { name: "couscous", quantity: 1, unit: "cup" },
      { name: "stock", quantity: 1, unit: "cup" },
      { name: "parsley", quantity: 3, unit: "tbsp" },
      { name: "lemon", quantity: 0.5, unit: null },
    ],
    instructions: [
      "Pour the boiling stock over the couscous and cover for 5 minutes.",
      "Fork it through with the parsley and lemon juice.",
    ],
    tags: ["Side", "Quick"],
  },
  {
    id: "garlic-bread",
    title: "Garlic Bread",
    description: "Shares the oven with almost anything.",
    kind: "bread",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 12,
    ovenTemp: 400,
    ovenTempUnit: "FAHRENHEIT",
    equipment: ["Sheet pan"],
    ingredients: [
      { name: "baguette", quantity: 1, unit: null },
      { name: "butter", quantity: 4, unit: "tbsp" },
      { name: "garlic", quantity: 3, unit: "cloves" },
    ],
    instructions: [
      "Heat the oven to 400F.",
      "Mash the crushed garlic into the soft butter.",
      "Split the bread, spread it, bake 10-12 minutes.",
    ],
    tags: ["Side", "Roast"],
  },
  {
    id: "sauteed-greens",
    title: "Sautéed Greens",
    description: "Whatever green is going, wilted with garlic.",
    kind: "vegetable",
    servings: 4,
    prepMinutes: 5,
    cookMinutes: 8,
    equipment: ["Skillet"],
    ingredients: [
      { name: "kale", quantity: 1, unit: "lb" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "garlic", quantity: 2, unit: "cloves" },
    ],
    instructions: [
      "Warm the oil and sliced garlic until it smells of garlic.",
      "Add the greens with a splash of water and a good pinch of salt.",
      "Cover 3 minutes, uncover and cook off the water.",
    ],
    tags: ["Side", "Quick"],
  },
  {
    id: "peas-and-butter",
    title: "Peas with Butter and Mint",
    description: "From frozen, and none the worse.",
    kind: "vegetable",
    servings: 4,
    prepMinutes: 2,
    cookMinutes: 5,
    equipment: ["Saucepan"],
    ingredients: [
      { name: "frozen peas", quantity: 1, unit: "lb" },
      { name: "butter", quantity: 2, unit: "tbsp" },
      { name: "mint", quantity: 1, unit: "tbsp" },
    ],
    instructions: [
      "Simmer the peas 3 minutes in a little salted water.",
      "Drain and toss with the butter and chopped mint.",
    ],
    tags: ["Side", "Quick"],
  },
];

export function findSide(id: string): SideDefinition | undefined {
  return SIDES.find((side) => side.id === id);
}
