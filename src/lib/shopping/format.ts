import { groupBySection } from "../grocery-sections";
import type { GroceryLine } from "../grocery";

/** "2 tbsp", "400 g", "3", or "" when there is no amount. */
export function formatAmount(line: GroceryLine): string {
  if (line.quantity == null) return "";
  const amount = String(line.quantity);
  return line.unit ? `${amount} ${line.unit}` : amount;
}

/**
 * The list as text, for pasting into a notes app or a shop's list importer.
 *
 * Grouped by aisle like the on-screen list, because this is the version that
 * actually goes round the shop - a flat alphabetical run sends you from flour
 * to lamb to lemons to milk. Headings are plain text with a blank line between
 * groups, which every notes app renders sensibly and no list importer chokes
 * on.
 */
export function formatAsPlainText(lines: GroceryLine[]): string {
  return groupBySection(lines)
    .map((section) => {
      const items = section.items.map((line) => {
        const amount = formatAmount(line);
        return amount ? `${amount} ${line.name}` : line.name;
      });
      return [`${section.label}:`, ...items].join("\n");
    })
    .join("\n\n");
}
