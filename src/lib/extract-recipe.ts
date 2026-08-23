import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { OVEN_TEMP_RANGE, type ExtractedRecipe } from "./recipe-schema";

/**
 * The shape Claude is asked to return.
 *
 * Deliberately looser than `recipeInput`: nullable numbers and plain strings,
 * so a PDF that genuinely lacks a cook time yields null rather than a
 * hallucinated number. The result is validated against the real schema before
 * anything is saved.
 */
const extractionSchema = z.object({
  title: z.string().describe("The recipe's name, as printed"),
  description: z
    .string()
    .nullable()
    .describe("One or two sentences. Null if the PDF has no summary."),
  servings: z
    .number()
    .int()
    .nullable()
    .describe("Servings/yield, null if absent"),
  yieldNote: z
    .string()
    .nullable()
    .describe(
      "Yield exactly as printed if it says more than a number, e.g. " +
        "'Makes 12 muffins'. Null if the card only gives a serving count.",
    ),
  prepMinutes: z.number().int().nullable(),
  cookMinutes: z.number().int().nullable(),
  restMinutes: z
    .number()
    .int()
    .nullable()
    .describe(
      "Resting, chilling, marinating, rising or proving time in minutes, " +
        "separate from active cooking. Null if none is given.",
    ),
  ovenTemp: z
    .number()
    .int()
    .nullable()
    .describe(
      "Oven temperature as printed, as a plain number. For a range, take the " +
        "first. Null if the recipe never uses an oven.",
    ),
  ovenTempUnit: z
    .enum(["FAHRENHEIT", "CELSIUS"])
    .nullable()
    .describe(
      "The unit that temperature was printed in. Required whenever ovenTemp " +
        "is set; null otherwise. A gas mark is not a temperature - leave both " +
        "null and mention the gas mark in notes.",
    ),
  equipment: z
    .array(z.string())
    .describe(
      "Specific pans, dishes or appliances the recipe requires, as printed, " +
        "e.g. '9x13 baking dish', 'Dutch oven'. Empty array if none is " +
        "specified. Do not list everyday utensils.",
    ),
  sourceName: z
    .string()
    .nullable()
    .describe(
      "Publication, book, website or person credited on the card, e.g. " +
        "'Bon Appetit'. Null if uncredited.",
    ),
  ingredients: z
    .array(
      z.object({
        name: z
          .string()
          .describe("Ingredient without the amount, e.g. 'chicken breast'"),
        quantity: z
          .number()
          .nullable()
          .describe(
            "Numeric amount. Convert fractions: 1/2 -> 0.5. Null if none.",
          ),
        unit: z
          .string()
          .nullable()
          .describe("Unit as written, e.g. 'tbsp', 'g', 'cup'. Null if none."),
        note: z
          .string()
          .nullable()
          .describe("Preparation note, e.g. 'finely chopped'. Null if none."),
      }),
    )
    .describe("Every ingredient, in the order listed"),
  instructions: z
    .array(z.string())
    .describe("Each numbered step as its own string, in order"),
  tags: z
    .array(z.string())
    .describe(
      "3-6 short labels describing cuisine, method, meal or dietary fit, " +
        "e.g. 'Italian', 'Sheet Pan', 'Vegetarian'. Title Case.",
    ),
  notes: z.string().nullable().describe("Any tips or storage notes"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "How confident you are that this document is a recipe and was read " +
        "correctly. Use 'low' if the document is not clearly a recipe.",
    ),
});

const SYSTEM_PROMPT = `You extract recipes from PDFs into structured data for a family recipe library.

Rules:
- Transcribe what the document says. Do not invent quantities, times or steps that are not present.
- If a field is genuinely absent, return null rather than guessing.
- Split combined ingredient lines into separate entries.
- Convert fractions and ranges to a single number: "1/2" becomes 0.5, "2-3" becomes 2.
- Keep instruction steps in their original order, one step per array entry.
- Oven temperature is often printed only inside a step ("bake at 375F for 20 minutes"). Read the steps for it, not just the header block.
- Give the temperature in the unit the card printed. Do not convert between Fahrenheit and Celsius.
- If the document is not a recipe, still return your best reading and set confidence to "low".`;

export type ExtractionResult =
  { ok: true; recipe: ExtractedRecipe } | { ok: false; error: string };

/**
 * Read a recipe out of a PDF.
 *
 * The PDF goes to the model as a document block, so Claude sees the layout and
 * any images, not just extracted text - which matters for recipes, where the
 * ingredient/method split is often carried by columns rather than wording.
 */
export async function extractRecipeFromPdf(
  pdfBytes: Uint8Array,
  filename: string,
): Promise<ExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY is not set, so PDF extraction is unavailable. " +
        "Add a key, or enter the recipe by hand.",
    };
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: Buffer.from(pdfBytes).toString("base64"),
              },
            },
            {
              type: "text",
              text: `Extract the recipe from this PDF (filename: ${filename}).`,
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(extractionSchema) },
    });

    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        error: "The model declined to read this document.",
      };
    }

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        ok: false,
        error:
          "Could not read a recipe out of that PDF. Try entering it by hand.",
      };
    }

    return { ok: true, recipe: toExtractedRecipe(parsed) };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        error: "Rate limited by the API. Try again shortly.",
      };
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        error: "The configured ANTHROPIC_API_KEY was rejected.",
      };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Extraction failed (${error.status}).` };
    }
    throw error;
  }
}

/** Normalise the model's looser shape into what the form and schema expect. */
function toExtractedRecipe(
  parsed: z.infer<typeof extractionSchema>,
): ExtractedRecipe {
  return {
    title: parsed.title.trim(),
    description: parsed.description?.trim() || null,
    servings: parsed.servings && parsed.servings > 0 ? parsed.servings : 4,
    yieldNote: parsed.yieldNote?.trim() || null,
    prepMinutes: parsed.prepMinutes ?? null,
    cookMinutes: parsed.cookMinutes ?? null,
    restMinutes: parsed.restMinutes ?? null,
    ...readOvenTemp(parsed.ovenTemp, parsed.ovenTempUnit),
    equipment: parsed.equipment.map((e) => e.trim()).filter(Boolean),
    sourceUrl: null,
    sourceName: parsed.sourceName?.trim() || null,
    notes: parsed.notes?.trim() || null,
    instructions: parsed.instructions.map((s) => s.trim()).filter(Boolean),
    ingredients: parsed.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        // The model is asked for a positive number or null, but a zero or
        // negative would fail validation later; treat it as "no amount".
        quantity: i.quantity && i.quantity > 0 ? i.quantity : null,
        unit: i.unit?.trim() || null,
        note: i.note?.trim() || null,
      })),
    tags: parsed.tags.map((t) => t.trim()).filter(Boolean),
    confidence: parsed.confidence,
  };
}

/**
 * Accept an oven temperature only if it is complete and plausible.
 *
 * A temperature with no unit, or one outside what an oven can do, is dropped
 * rather than passed on. The alternative is a validation failure that loses the
 * whole extraction over one misread number - the recipe is still worth having,
 * and the cook can fill the temperature in.
 */
function readOvenTemp(
  temp: number | null,
  unit: "FAHRENHEIT" | "CELSIUS" | null,
): Pick<ExtractedRecipe, "ovenTemp" | "ovenTempUnit"> {
  if (temp == null || unit == null) {
    return { ovenTemp: null, ovenTempUnit: null };
  }

  const { min, max } = OVEN_TEMP_RANGE[unit];
  if (temp < min || temp > max) {
    return { ovenTemp: null, ovenTempUnit: null };
  }

  return { ovenTemp: temp, ovenTempUnit: unit };
}
