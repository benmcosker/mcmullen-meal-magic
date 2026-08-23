import type { TemperatureUnit } from "./recipe-schema";

/**
 * An oven temperature as the card printed it, with the other scale alongside.
 *
 * The printed number comes first because it is the one you dial. The
 * conversion is rounded to the nearest five: an oven dial has no business
 * claiming 356 degrees, and "355" reads as an approximation, which it is.
 */
export function formatOvenTemp(
  temp: number | null | undefined,
  unit: TemperatureUnit | null | undefined,
): string | null {
  if (temp == null || !unit) return null;

  if (unit === "FAHRENHEIT") {
    return `${temp}°F (${roundToFive(((temp - 32) * 5) / 9)}°C)`;
  }
  return `${temp}°C (${roundToFive((temp * 9) / 5 + 32)}°F)`;
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

/** "1 hr 25 min", "40 min". Null for nothing, so callers can skip the row. */
export function formatMinutes(
  minutes: number | null | undefined,
): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
