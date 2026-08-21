import type { ShoppingProvider } from "@/generated/prisma/enums";

import type { GroceryLine } from "../grocery";

import { formatAmount, formatAsPlainText } from "./format";
import type {
  HandoffResult,
  ProviderInfo,
  ProviderLine,
  ShoppingProviderAdapter,
} from "./types";

/**
 * Amazon Fresh and Whole Foods.
 *
 * There is no public ordering API for either. Amazon grants Fresh API access
 * case by case through a business arrangement - that is how Allrecipes built
 * its integration - and nothing equivalent to Instacart's cart endpoint is
 * available to sign up for.
 *
 * The add-to-cart URL (/gp/aws/cart/add.html?ASIN.1=...) does still work, but
 * it needs ASINs. Getting those means the Product Advertising API, which
 * requires an Associates account with qualifying sales and does not reliably
 * cover Fresh or Whole Foods grocery items anyway. Scraping them would breach
 * Amazon's terms.
 *
 * So this provider does the honest thing: a search link per ingredient into
 * the right storefront, plus the list as plain text to paste. It cannot build
 * a basket, and the UI says so rather than implying otherwise.
 *
 * If you later obtain real Fresh API access, this is the seam to replace: the
 * adapter interface already allows a `cart` hand-off, and only this file and
 * its provider info need to change.
 */

const AMAZON_BASE = "https://www.amazon.com/s";

/**
 * Amazon's search-index aliases, which scope a search to one storefront.
 *
 * Not verified against a live request from the build environment - amazon.com
 * is blocked by its egress policy - so confirm these in a browser before
 * relying on them. They are trivially checkable: the link either lands in the
 * right storefront or it does not.
 */
const SEARCH_INDEX: Record<"AMAZON_FRESH" | "WHOLE_FOODS", string> = {
  AMAZON_FRESH: "amazonfresh",
  WHOLE_FOODS: "wholefoods",
};

const LABELS: Record<"AMAZON_FRESH" | "WHOLE_FOODS", string> = {
  AMAZON_FRESH: "Amazon Fresh",
  WHOLE_FOODS: "Whole Foods",
};

/**
 * A search URL for one ingredient.
 *
 * Only the ingredient name goes into the query. Including the amount would
 * search for the literal text "2 tbsp butter" and match far worse than
 * "butter" does.
 */
export function buildSearchUrl(
  ingredientName: string,
  storefront: "AMAZON_FRESH" | "WHOLE_FOODS",
): string {
  const params = new URLSearchParams({
    k: ingredientName.trim(),
    i: SEARCH_INDEX[storefront],
  });
  return `${AMAZON_BASE}?${params.toString()}`;
}

/** The storefront's own landing page, for browsing rather than per-item search. */
export function buildStoreUrl(
  storefront: "AMAZON_FRESH" | "WHOLE_FOODS",
): string {
  return `${AMAZON_BASE}?${new URLSearchParams({
    k: "groceries",
    i: SEARCH_INDEX[storefront],
  }).toString()}`;
}

export function buildProviderLines(
  lines: GroceryLine[],
  storefront: "AMAZON_FRESH" | "WHOLE_FOODS",
): ProviderLine[] {
  return lines
    .filter((line) => line.name.trim().length > 0)
    .map((line) => ({
      name: line.name.trim(),
      amount: formatAmount(line),
      url: buildSearchUrl(line.name, storefront),
    }));
}

function createAmazonProvider(
  storefront: "AMAZON_FRESH" | "WHOLE_FOODS",
): ShoppingProviderAdapter {
  return {
    info(): ProviderInfo {
      return {
        id: storefront as ShoppingProvider,
        label: LABELS[storefront],
        kind: "links",
        description:
          "Amazon has no public ordering API, so this opens a search per " +
          "ingredient and gives you the list to paste. You add the items.",
        // Needs no key or approval, so it is always usable.
        available: true,
      };
    },

    async handoff(lines): Promise<HandoffResult> {
      if (lines.length === 0) {
        return { ok: false, error: "There is nothing on the list to send." };
      }

      return {
        ok: true,
        kind: "links",
        lines: buildProviderLines(lines, storefront),
        text: formatAsPlainText(lines),
        storeUrl: buildStoreUrl(storefront),
      };
    },
  };
}

export const amazonFreshProvider = createAmazonProvider("AMAZON_FRESH");
export const wholeFoodsProvider = createAmazonProvider("WHOLE_FOODS");
