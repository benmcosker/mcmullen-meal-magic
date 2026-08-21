import type { GroceryLine } from "../grocery";

/** "2 tbsp", "400 g", "3", or "" when there is no amount. */
export function formatAmount(line: GroceryLine): string {
  if (line.quantity == null) return "";
  const amount = String(line.quantity);
  return line.unit ? `${amount} ${line.unit}` : amount;
}

/** One line per item, for pasting into a notes app or a shop's list importer. */
export function formatAsPlainText(lines: GroceryLine[]): string {
  return lines
    .map((line) => {
      const amount = formatAmount(line);
      return amount ? `${amount} ${line.name}` : line.name;
    })
    .join("\n");
}
