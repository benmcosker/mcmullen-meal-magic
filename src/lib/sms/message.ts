/**
 * Turning a shopping list into messages a phone will actually show.
 */

/**
 * How much text goes in one message before it is split.
 *
 * Twilio accepts up to 1600 characters and splits them into segments the
 * handset reassembles, so this is not a hard limit - it is the point past
 * which a wall of text stops being a shopping list. Comfortably under 1600 so
 * the numbering suffix can never push a part over the real ceiling.
 */
export const MAX_MESSAGE_CHARS = 1200;

/** Room kept for " (10/10)" so numbering cannot overflow a part. */
const SUFFIX_ALLOWANCE = 10;

/**
 * Characters that force a message out of the GSM alphabet and into UCS-2,
 * which cuts a segment from 153 characters to 67 - so one stray en-dash in an
 * ingredient name can more than double what a list costs to send, and it is
 * the recipe PDFs that put them there: curly quotes, fraction glyphs, and the
 * dashes a typesetter prefers.
 *
 * Only characters with an unambiguous plain equivalent are mapped. Anything
 * else - a name in another script, an emoji somebody put in a recipe title -
 * is left alone, because sending it as UCS-2 is right and mangling it is not.
 */
const PLAIN_EQUIVALENTS: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "–": "-",
  "—": "-",
  "−": "-",
  "…": "...",
  " ": " ",
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "×": "x",
  "°": " deg",
};

/** Swap typographic characters for plain ones, where the meaning is kept. */
export function toPlainText(text: string): string {
  return text.replace(
    /[‘’‚‛“”„–—−… ½¼¾⅓⅔×°]/g,
    (char) => PLAIN_EQUIVALENTS[char] ?? char,
  );
}

/**
 * Split a message into parts that fit, breaking where a reader would.
 *
 * Preference order is blank line, then single line, then - only for a line too
 * long to fit on its own - mid-line. An ingredient is rarely 1200 characters,
 * but a list that cannot be split must still be sent rather than dropped.
 *
 * Parts are numbered only when there is more than one, because "(1/1)" on a
 * single message is noise that reads like something went wrong.
 */
export function splitMessage(
  body: string,
  max: number = MAX_MESSAGE_CHARS,
): string[] {
  const text = toPlainText(body).trim();
  if (!text) return [];
  if (text.length <= max) return [text];

  const budget = Math.max(1, max - SUFFIX_ALLOWANCE);
  const parts: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) parts.push(current.trim());
    current = "";
  };

  // Sections first, so a part break lands between aisles wherever it can.
  for (const block of text.split("\n\n")) {
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= budget) {
      current = candidate;
      continue;
    }

    flush();
    if (block.length <= budget) {
      current = block;
      continue;
    }

    // The block alone is too big: fall back to lines, then to hard slicing.
    for (const line of block.split("\n")) {
      const withLine = current ? `${current}\n${line}` : line;
      if (withLine.length <= budget) {
        current = withLine;
        continue;
      }
      flush();
      let rest = line;
      while (rest.length > budget) {
        parts.push(rest.slice(0, budget));
        rest = rest.slice(budget);
      }
      current = rest;
    }
  }
  flush();

  return parts.map((part, index) => `${part} (${index + 1}/${parts.length})`);
}

/** The heading a shopping list message opens with. */
export function shoppingListMessage(
  weekLabel: string,
  listText: string,
): string {
  return `Shopping for ${weekLabel}\n\n${listText}`;
}
