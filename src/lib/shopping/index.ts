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

export * from "./types";
export { formatAmount, formatAsPlainText } from "./format";
