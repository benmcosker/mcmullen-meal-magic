import type { ShoppingProvider } from "@/generated/prisma/enums";
import type { GroceryLine } from "../grocery";

/**
 * How a provider hands a shopping list over.
 *
 * Two shapes, because the shops genuinely differ:
 *
 * - `cart` — the provider has an API that builds a real basket and returns one
 *   URL to it. Instacart works this way.
 * - `links` — no ordering API exists, so the best available is a search link
 *   per ingredient plus a list to paste. Amazon works this way; see
 *   ./amazon.ts for why.
 *
 * Keeping these distinct in the type means the UI cannot accidentally present
 * a pile of search links as though a cart had been built.
 */
export type HandoffKind = "cart" | "links";

export type ProviderLine = {
  name: string;
  /** Human-readable amount, e.g. "2 tbsp". Empty when unquantified. */
  amount: string;
  url: string;
};

export type HandoffResult =
  | { ok: true; kind: "cart"; url: string; itemCount: number }
  | {
      ok: true;
      kind: "links";
      lines: ProviderLine[];
      text: string;
      storeUrl: string;
    }
  | { ok: false; error: string };

export type ProviderInfo = {
  id: ShoppingProvider;
  label: string;
  kind: HandoffKind;
  /** Shown under the button so the difference in behaviour is not a surprise. */
  description: string;
  /** False when the provider needs configuration it has not been given. */
  available: boolean;
  /** Why it is unavailable, when it is. */
  unavailableReason?: string;
};

export type ShoppingProviderAdapter = {
  info(): ProviderInfo;
  handoff(lines: GroceryLine[], weekStart: Date): Promise<HandoffResult>;
};
