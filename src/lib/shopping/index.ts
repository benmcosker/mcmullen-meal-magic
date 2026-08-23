import type { ShoppingProvider } from "@/generated/prisma/enums";

import { amazonFreshProvider, wholeFoodsProvider } from "./amazon";
import { instacartProvider } from "./instacart";
import type { ProviderInfo, ShoppingProviderAdapter } from "./types";

const providers: Record<ShoppingProvider, ShoppingProviderAdapter> = {
  INSTACART: instacartProvider,
  AMAZON_FRESH: amazonFreshProvider,
  WHOLE_FOODS: wholeFoodsProvider,
};

export function getProvider(id: ShoppingProvider): ShoppingProviderAdapter {
  return providers[id];
}

/**
 * Every provider, in the order they should appear in the UI.
 *
 * The ones that work come first. Instacart builds a real cart and would
 * otherwise lead, but it cannot be switched on while Instacart is refusing new
 * developer applications - and putting a dead option above two working ones
 * reads as though the working ones are the fallback.
 */
export function listProviders(): ProviderInfo[] {
  return (
    ["AMAZON_FRESH", "WHOLE_FOODS", "INSTACART"] as ShoppingProvider[]
  ).map((id) => providers[id].info());
}

/**
 * The providers worth putting in front of someone: the ones that can actually
 * do something right now.
 *
 * Instacart is registered, tested and ready, but until a key exists it can only
 * appear as a greyed-out button above a sentence explaining that it will never
 * work. That is a notice, not an option, and it sits on the page every week
 * saying the same thing. Filtering on `available` rather than naming Instacart
 * means the day a key is set it comes back on its own, in its proper place, with
 * no code change.
 */
export function listUsableProviders(): ProviderInfo[] {
  return listProviders().filter((provider) => provider.available);
}

export * from "./types";
export { formatAmount, formatAsPlainText } from "./format";
