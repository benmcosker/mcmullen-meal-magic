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

/** Every provider, in the order they should appear in the UI. */
export function listProviders(): ProviderInfo[] {
  return (
    ["INSTACART", "AMAZON_FRESH", "WHOLE_FOODS"] as ShoppingProvider[]
  ).map((id) => providers[id].info());
}

export * from "./types";
export { formatAmount, formatAsPlainText } from "./format";
