/**
 * The page's own measurements, shared by the top bar and everything under it.
 *
 * They have to agree: the wordmark and the page title sit on the same left
 * edge in the design, and a bar that spans the window over content in a
 * narrower container puts them a hundred pixels apart on a wide screen.
 *
 * A plain module with no directive, so both a server component and a client
 * one can import it. A constant exported from a `"use client"` file crosses
 * the boundary as a client reference rather than a value.
 */

/**
 * The design is drawn at 1440px. Past that the page stops widening rather than
 * stretching a three-column grid across a desktop monitor - the line lengths
 * are the point of the layout.
 */
export const PAGE_MAX_WIDTH = 1440;

/** 56px at desktop, 20px on a phone, in MUI spacing units. */
export const PAGE_PADDING_X = { xs: 2.5, md: 7 };
