# Handoff: Meal Magic — visual identity pass

## Overview

Meal Magic is an existing Next.js 15 / React / MUI app (`benmcosker/mcmullen-meal-magic`) — a shared recipe box, weekly meal planner and grocery list for one household. It works; it looks like default Material. This handoff is a **visual identity pass over five existing screens**: Recipes list, Recipe detail, This week (plan), Pantry, Household.

**No new features, no new routes, no data-model changes.** Every element in these designs maps to data the app already fetches. The one structural change is on the Recipes list: the alphabetical wall of ~60 tag chips is replaced by six curated collections plus a "Filters" entry point.

The direction is "modern cookbook": editorial serif for food and prose, a grotesque for machinery and data, warm paper instead of white, hairline rules instead of card borders and shadows.

## About the design files

The files in this bundle are **design references created in HTML** — a prototype showing intended look, not production code to copy. The task is to **recreate these designs inside the existing Next.js + MUI codebase**, using its established patterns: the MUI theme in `src/theme/theme.ts`, the server/client component boundaries already in place, `sx` props rather than new stylesheets, and the existing components (`AppShell`, `TopBar`, `RecipePhoto`, `RecipePlaceholder`, `ReviewStars`, `RecipeSearchBar`, `PantryManager`, `WeekPlanner`, `HouseholdManager`).

Most of this work should land in `src/theme/theme.ts` and `src/app/layout.tsx` (fonts, palette, typography variants, component overrides) before any individual page is touched. If the theme is right, several screens will improve without page edits.

`Meal Magic identity.dc.html` is a single HTML file — open it in a browser. It contains six stacked 1440px frames, each labelled: Identity, Recipes, Recipe, This week, Pantry, Household.

`before-recipes-screen.png` is a screenshot of the current Recipes list, for comparison.

## Fidelity

**High-fidelity.** Colors, typography, spacing and copy are final. Recreate pixel-accurately at desktop width, then apply the responsive rules in the "Responsive behavior" section below.

Two exceptions:

- **All photography is placeholder.** The diagonal-striped blocks with monospace captions are stand-ins. Real photos come from `recipe.imageUrl` via the existing `RecipePhoto`; recipes without one keep using `RecipePlaceholder` (whose styling should be updated to the new palette — see Assets).
- **The wordmark mark** (a terracotta dot inside a green circle) is a placeholder device, not a finished logo. Implement it as drawn, but expect it to be replaced.

---

## Design tokens

Put all of these in `src/theme/theme.ts`. The existing `primary.main` (#2f6f4e) and `secondary.main` (#b4552d) are unchanged — the palette below keeps them and rebuilds everything around them.

### Colors — light scheme

| Token | Hex | Role |
| --- | --- | --- |
| Paper | `#f7f4ed` | Page background (`background.default`) |
| Paper raised | `#efe9dc` | Filled chips, code blocks, avatar fills |
| Canvas | `#e9e4d8` | Only the prototype's backdrop between frames — **not used in the app** |
| Ink | `#1a1815` | Primary text, buttons, active rules (`text.primary`) |
| Ink soft | `#2c2820` | Long-form body copy (method steps) |
| Muted | `#4a453c` | Secondary prose, descriptions |
| Muted light | `#6f6a5e` | Tertiary text, outlined-chip labels |
| Label | `#8a8272` | Uppercase eyebrow labels, captions (`text.secondary`) |
| Faint | `#a19684` | Placeholder text, timestamps, disabled |
| Rule | `#ded7c8` | Hairline dividers, borders (`divider`) |
| Rule dashed | `#cfc6b2` | Dashed borders (suggested staples, invite avatar) |
| Green | `#2f6f4e` | `primary.main` — kept. Ingredient amounts, primary actions, stars, links |
| Clay | `#b4552d` | `secondary.main` — kept. Eyebrows, active nav underline, step numerals, oven temp |
| Photo stripe A | `#e8e0d0` | Placeholder gradient |
| Photo stripe B | `#e1d8c5` | Placeholder gradient |

Dark scheme is out of scope for this pass. The theme currently defines one (`colorSchemeSelector: "media"`); keep it working by mapping the new light tokens and leaving dark as-is until a separate pass.

Photo placeholder fill:
```css
repeating-linear-gradient(135deg, #e8e0d0 0 11px, #e1d8c5 11px 22px)
```

### Typography

Two Google fonts, loaded via `next/font/google` in `src/app/layout.tsx`, replacing Geist:

```ts
import { Newsreader, Karla } from "next/font/google";
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], weight: ["300","400","500","600"], variable: "--font-newsreader" });
const karla = Karla({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-karla" });
```

- **Newsreader** — recipe titles, page headings, ingredient names, method steps, descriptions, the wordmark, member names, shopping-list items. Light 300 is used italic for the second half of two-part titles.
- **Karla** — nav, buttons, eyebrow labels, metadata rows, counts, form labels, ingredient amounts.
- **ui-monospace / Menlo** — invite codes and the placeholder captions only.

| Style | Font | Size | Weight | Line-height | Letter-spacing | Used for |
| --- | --- | --- | --- | --- | --- | --- |
| Page title | Newsreader | 76px | 400 | 0.95 | -0.03em | "Recipes", "This week", "Pantry", "The McMullens" |
| Recipe title | Newsreader | 68px | 400 | 0.98 | -0.03em | Recipe detail h1, max-width 760px |
| Hero title | Newsreader | 52px | 400 | 1.05 | -0.025em | Featured recipe on the list |
| Section head | Newsreader | 30–34px | 400 | normal | normal | "Ingredients", "Method", "Shopping list" |
| Card title | Newsreader | 25px | 400 | 1.15 | -0.015em | Grid recipe titles |
| Lede | Newsreader italic | 24–26px | 300 | 1.5 | normal | Recipe description, Pantry intro |
| Body serif | Newsreader | 20px | 400 | 1.62 | normal | Method steps (max-width 62ch) |
| Body serif sm | Newsreader | 17–19px | 400 | 1.35–1.55 | normal | Ingredients, list items, pantry chips |
| Wordmark | Newsreader | 23px nav / 38px identity | 400 + 300 italic | normal | -0.015em | "Meal *Magic*" |
| Eyebrow | Karla | 11px | 700 | normal | 0.18em, uppercase | Clay-colored context lines above titles |
| Section label | Karla | 11px | 700 | normal | 0.16em, uppercase | "In the cupboard", "Produce" |
| Nav item | Karla | 12px | 600 (700 active) | normal | 0.14em, uppercase | Top nav, text buttons |
| Button | Karla | 12px | 700 | normal | 0.14em, uppercase | Filled buttons |
| Meta | Karla | 12.5–13px | 400 | normal | 0.03–0.04em | "45 min / Serves 4 / Grill" |
| Amount | Karla | 13px | 700 | normal | 0.04em | Ingredient quantities, green |
| Caption | Karla | 11–13px | 400 | 1.7 | 0.04–0.1em | Helper text, tag lines |
| Tag | Karla | 11px | 400 | normal | 0.12em, uppercase | Outlined tag chips |

### Spacing, shape, shadow

- **Border radius: 0.** Override `shape.borderRadius` to `0`. Nothing on these screens is rounded except circles (the wordmark mark, member avatars). This is the single biggest departure from the current build — MUI's default 10px radius on every card, chip, button and input is a large part of what makes the app read as generic.
- **No shadows.** `disableElevation` is already set on buttons; extend that to cards. Separation comes from hairline rules and whitespace.
- **Borders:** 1px solid. `#ded7c8` for ordinary dividers, `#1a1815` for the emphatic top rule above a section (used under "Ingredients", "Method", "Shopping list", above each planner day column, and under the search field).
- **Page padding:** 56px horizontal, 56px top, 72–80px bottom. Nav bar: 20px vertical, 56px horizontal.
- **Spacing scale in use:** 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 32, 36, 40, 44, 48, 52, 56, 64, 72, 80.

### Buttons

Three variants, all square, all Karla 12px/700/0.14em uppercase:

- **Primary (ink):** `#1a1815` bg, `#f7f4ed` text, padding 14px 22px. "New recipe", "Add" (pantry).
- **Primary (green):** `#2f6f4e` bg, `#f7f4ed` text, padding 14px 22px. "Add to this week", "Text the list" — the green is reserved for actions that change the plan.
- **Outlined:** transparent, `#4a453c` text, 1px `#ded7c8`, padding 13px 20px. "Edit".
- **Text:** `#8a8272`, no border, sometimes with a 1px `#ded7c8` bottom rule. Sort, filters, week nav.

Hover states are not drawn in the prototype. Suggested: filled buttons darken 8%; text and outlined buttons shift to `#1a1815`; recipe cards raise their title to `#b4552d` and nothing else moves.

---

## Screens

### 1. Global — top bar

Replaces `src/components/TopBar.tsx`'s MUI AppBar. Height ~65px, `#f7f4ed`, 1px `#ded7c8` bottom border, no elevation.

- **Left, wordmark:** a 24px green (`#2f6f4e`) circle containing a centered 9px clay (`#b4552d`) circle, then 10px gap, then "Meal" in Newsreader 23px/400 plus " Magic" in Newsreader 23px/300 italic, both `#1a1815`. 14px right margin. Links to `/`.
- **Center, nav:** 28px gap. Karla 12px, 0.14em, uppercase. Inactive `#8a8272`/600; active `#1a1815`/700 with a 2px `#b4552d` bottom border and 3px bottom padding. Order unchanged: Recipes, This week, Pantry, Upload, Household.
- **Right:** user's first name in Newsreader 16px italic `#4a453c`, then "Sign out" in Karla 12px/600 uppercase `#8a8272`.

Keep the existing horizontal-scroll behavior for the nav row on narrow screens.

### 2. Recipes list — `/recipes`

The screen that changes most. Current version: `src/app/recipes/page.tsx`.

**Header row** — flex, baseline-aligned, 36px bottom margin:
- Left: eyebrow "The McMullen recipe box · 148 dishes" (clay, 12px bottom margin), then h1 "Recipes" at 76px.
- Right: "Filters · 60 tags" text button with a 1px `#ded7c8` bottom rule, 18px gap, then the ink "New recipe" button.

**Search row** — a single field with no box: 1px `#1a1815` bottom border only, 14px bottom padding, 22px bottom margin. Placeholder is Newsreader 26px italic `#a19684`, reading **"What are you in the mood for?"**. Sort sits at the far right of the same rule as a Karla 12px uppercase `#8a8272` text button reading "Newest first ↓".

**Collections row** — 26px gap, 56px bottom margin. A "Collections" section label, then six items, each Newsreader 19px `#1a1815` with a 1px `#ded7c8` bottom rule and its count trailing in Karla 11px `#a19684`: Weeknight 24, Sunday cooking 11, Grill 9, Pasta 7, One pot 5, Comfort 7.

> **Implementation note.** These six are a curated subset of the existing tags, not a new concept — `listTagsWithCounts()` already returns everything needed. Suggested approach: hardcode an ordered list of six tag slugs as a constant (the way `MAX_TAGS_ON_CARD` is already handled) and render those, with the full set moved behind the Filters control. The full tag list should open in a panel or dialog using the existing chips; that panel is not drawn here, so match the app's other dialogs.

**Hero recipe** — the newest recipe, in a `1.35fr 1fr` grid, 52px gap, followed by 56px padding and a 1px `#ded7c8` rule.
- Left: 480px-tall photo, full bleed within its column, square corners.
- Right: vertically centered, 22px gap — clay eyebrow "Added this week"; title at 52px (second phrase in 300 italic); description Newsreader 20px/1.6 `#4a453c` max-width 38ch; a metadata row of "Serves 4 / 1 hr 20 min / 475°F oven" at 13px `#736c60` with `#ded7c8` slash separators, the oven temp in clay 600; then up to three outlined tag chips (11px uppercase, 1px `#ded7c8`, 6px 11px padding).

**Grid** — 3 columns, 44px row gap / 40px column gap, 44px top padding. Each card has **no border, no background, no padding** — it is just a stack:
1. Photo, 230px tall, square.
2. Title, Newsreader 25px, no clamp in the design (a 2-line clamp is acceptable; keep the existing `-webkit-line-clamp: 2`).
3. Meta row: time / serves / cooking note, 12.5px `#736c60`, slash-separated.
4. A 1px `#ded7c8` rule.
5. Tag line as plain text, not chips: Karla 11px, 0.13em, uppercase, `#a19684`, tags joined with " · ".

Note what is **removed** from the current card: the outlined MUI Card, the description clamp, the "No reviews yet" caption, and the floating red delete button in the photo corner. Ratings appear only when a recipe has them (star row in green Newsreader, see Recipe detail). Delete moves to the recipe page, which already has it — the corner button on every tile is six red circles per screen and no one deletes recipes in bulk.

### 3. Recipe detail — `/recipes/[id]`

Current version: `src/app/recipes/[id]/page.tsx`.

**Header** — `1fr auto` grid, end-aligned, 34px bottom margin:
- Left: clay eyebrow combining the primary tag and provenance, "Beef · Added by Ben, March"; then h1 at 68px, **max-width 760px set on the h1 itself** (this matters — a `ch`-based max-width on the wrapper resolves against the wrong font size), second phrase in 300 italic.
- Right: outlined "Edit" and green "Add to this week".

**Lede** — the description, Newsreader 26px/300 italic, `#4a453c`, max-width 62ch, 32px bottom margin.

**Meta rule** — a horizontal band with a 1px `#1a1815` top border and 1px `#ded7c8` bottom border, 16px vertical padding, 40px bottom margin. Each item is a Karla 11px/0.14em uppercase `#a19684` label followed by an 8px gap and a 13px `#4a453c` value: Serves 4 | Total 45 min | Rest 10 min. Then the cooking method in clay 600 ("Grill, high" — this is where `formatOvenTemp` output goes). Far right: the rating as green Newsreader 19px stars plus "4.5 · 2 reviews" in Karla 12px `#8a8272`. When `summary.count === 0`, omit the whole rating rather than printing "No reviews yet".

**Photo** — full content width, 460px tall, square, 56px bottom margin. `priority` load, as today.

**Body** — `320px 1fr` grid, 72px gap:
- *Ingredients* (left): heading, 1px `#1a1815` rule, then rows of 11px vertical padding separated by 1px `#ded7c8`. Each row is a 74px-min-width green Karla 13px/700 amount and a Newsreader 18px name, baseline-aligned, 14px gap. Below: a `#8a8272` 12px note, "Salt, pepper and olive oil are in your pantry, so they stay off the shopping list." — generated from the household's actual pantry matches, or omitted if none.
- *Method* (right): heading, 1px `#1a1815` rule, then steps in a 26px-gap column. Each step is a `56px 1fr` grid: the numeral in Newsreader 40px/300 clay, and the text in Newsreader 20px/1.62 `#2c2820`, max-width 62ch.

Reviews and the "Added by" footer keep their current position and logic; restyle them to the tokens above.

### 4. This week — `/plan`

Current version: `src/app/plan/page.tsx` + `src/components/WeekPlanner.tsx`.

**Header** — clay eyebrow with the date range and progress, "Mar 17 – 23 · 5 of 7 nights planned"; h1 "This *week*" at 76px with "week" in 300 italic. Right: "← Last" and "Next →" text buttons, then the green "Text the list" button.

**Week strip** — a 7-column grid, 14px gap, 64px bottom margin. Each day column:
- 1px `#1a1815` top border, 12px top padding, 10px internal gap.
- Row: day abbreviation (Karla 11px/700/0.16em uppercase `#1a1815`) left, date number (Newsreader 16px `#a19684`) right.
- 120px-tall photo block. **Empty days** use flat `#efe9dc` with centered Newsreader 15px italic `#a19684` text instead of a photo — "nothing yet", or a custom note like "eating out".
- Meal title, Newsreader 18px/1.25, min-height 44px so columns align whether or not a day is filled.
- Servings, Karla 11px/0.1em uppercase `#a19684`.

**Shopping list** — a `1fr 300px` grid, 64px gap:
- Left: "Shopping list" (Newsreader 34px) with "23 items · 4 aisles" beside it in Karla 12px uppercase `#a19684`; a 1px `#1a1815` rule; then a 4-column grid, 36px gap, one column per aisle. Each aisle has a clay section label and items in Newsreader 17px, each preceded by an 11px square 1px `#a19684` checkbox with 9px gap.
- Right: a panel with a 1px `#ded7c8` left border and 36px left padding — section label "Left off the list", a Newsreader 17px sentence naming the pantry items excluded this week, and an "Edit pantry" link in green Karla 12px uppercase with a green bottom rule.

Aisle grouping already exists in `src/lib/grocery-sections.ts`.

### 5. Pantry — `/pantry`

Current version: `src/app/pantry/page.tsx` + `src/components/PantryManager.tsx`.

`1fr 380px` grid, 80px gap.

**Left:**
- h1 "Pantry" at 76px, 16px bottom margin.
- Intro in Newsreader 24px/300 italic `#4a453c`, max-width 44ch, 44px bottom margin. Copy unchanged from today: "Things you always have in. These never reach the weekly shopping list, however many recipes call for them."
- Section label "In the cupboard · 14", then the items as filled square chips: `#efe9dc` background, Newsreader 19px `#1a1815`, 9px 16px padding, 10px gap, with a Karla 13px `#a19684` "×" 10px to the right of the label.
- Then a rule row: section label "Common staples", a hairline that fills the space, and an "Add all 5" green text button at the far right.
- Suggested staples as dashed-border chips: 1px dashed `#cfc6b2`, no fill, Newsreader 19px `#6f6a5e`, prefixed "+ ". Source stays `SUGGESTED_PANTRY_STAPLES`.

**Right — add panel:** a box with a 1px `#1a1815` border, 32px padding, 18px gap. Heading "Add a staple" (Newsreader 26px); an underline-only input (1px `#1a1815` bottom border, 10px padding, Newsreader 20px italic `#a19684` placeholder "Olive oil"); the ink "Add" button, full width, centered; then helper text at 13px/1.7 `#8a8272`: "Anything here disappears from every shopping list from now on. Remove it and it comes back."

### 6. Household — `/household`

Current version: `src/app/household/page.tsx` + `src/components/HouseholdManager.tsx`.

**Header** — clay eyebrow "One library · one plan · one list"; h1 using the household's own name, "The *McMullens*", 76px with the surname in 300 italic. 48px bottom margin.

**Body** — `1fr 360px` grid, 72px gap.

*Left, members:* a "At the table" section label with a 1px `#1a1815` rule filling the row. Then one row per member, 20px vertical padding, 1px `#ded7c8` separator, 20px gap:
- 52px circle, `#efe9dc` fill, 1px `#ded7c8` border, first initial in Newsreader 21px green.
- Name in Newsreader 24px; below it, email and phone joined by " · " in Karla 13px `#8a8272`. Members without a number read "No number on file".
- Right-aligned: recipe contribution count, Karla 11px/0.12em uppercase `#6f6a5e`.

Then an invite row in the same rhythm: a 52px dashed-border circle with a "+", and Newsreader 21px italic `#6f6a5e` reading "Invite someone to cook from this box".

*Right, sidebar:* 32px gap.
- Pending invite card: 1px `#1a1815` border, 28px padding — clay label "Pending invite", the email in Newsreader 22px, the code in monospace 19px/0.22em green on `#efe9dc` with 12px 14px padding, then expiry in Karla 12px `#8a8272`.
- Shopping-texts block: section label plus a Newsreader 17px sentence naming who receives the Sunday text and how many members lack numbers. Drives off the existing `shoppingListAudience()` data.

---

## Interactions & behavior

Nothing in the app's behavior changes. For completeness:

- **Recipes:** search is URL-backed and debounced 250ms (`RecipeSearchBar` — keep as-is). Sort writes `?sort=`, with `newest` omitted. Collections toggle `?tag=` exactly as the chips do today. The Filters control opens the full tag set; multi-select, same params.
- **Recipe detail:** Edit and Delete render only when `recipe.householdId === user.householdId` — unchanged, and still absent rather than disabled for other households.
- **Plan:** week nav writes `?week=`. Day cells open the recipe picker. "Text the list" gates on `smsAvailable()`.
- **Pantry:** add/remove are the existing server actions with `useTransition`; suggested staples add sequentially.
- **Transitions:** none in the design beyond default link/button hovers. Keep it still — the type is doing the work.

## Responsive behavior

The prototype is desktop-only at 1440px. Breakpoint guidance, following the app's existing MUI breakpoints:

- **Page titles** step from 76px → 48px at `sm` and below. Recipe detail h1: 68px → 40px.
- **Recipes grid:** 3 → 2 at `md` → 1 at `sm`. The hero collapses to a stacked photo-above-text at `md`.
- **Collections row** scrolls horizontally at `sm`, matching the existing tag-row treatment.
- **Recipe body** (`320px 1fr`) stacks at `md`, ingredients first.
- **Week strip** stays 7 columns to `md`, then becomes a vertical list of day rows at `sm` — a 7-column grid on a phone is unreadable. The shopping list goes 4 → 2 → 1 columns.
- **Pantry and Household** side panels move below the main column at `md`.

## State management

No new state. Everything is already handled by existing server components, URL search params, and the `useTransition` patterns in `PantryManager` / `HouseholdManager` / `WeekPlanner`.

## Assets

- **Fonts:** Newsreader and Karla, both Google Fonts, via `next/font/google`. Geist can be removed.
- **App icon** (`src/app/icon.svg`): currently a white Material "restaurant" glyph on a `#2f6f4e` rounded tile. Replace with the new mark — a 9px clay circle centered in a green field — keeping the filled-tile approach so it survives dark browser chrome. The existing file's comment explains why the tile matters; that reasoning still holds.
- **`RecipePlaceholder`** (`src/components/RecipePlaceholder.tsx`): retune to the new palette — the `repeating-linear-gradient(135deg, #e8e0d0, #e1d8c5)` stripe is the intended treatment for a photo-less recipe.
- **Photography:** none supplied. All photo areas in the prototype are placeholders; real images come from `recipe.imageUrl`.
- **Icons:** the design uses almost none. The MUI icons currently in use (Search, Add, Edit, Delete, oven/equipment/PDF chips) can be dropped in favor of text labels, except where an icon is genuinely load-bearing.

## Copy

Text worth keeping verbatim, since it carries the voice:

- Search placeholder: "What are you in the mood for?"
- Recipes eyebrow: "The McMullen recipe box · 148 dishes" (count is live)
- Empty plan days: "nothing yet" / "eating out"
- Plan sidebar: "Left off the list"
- Household eyebrow: "One library · one plan · one list"
- Invite row: "Invite someone to cook from this box"
- Pantry intro and helper text: unchanged from the current app

The existing app's copy is already good — plain, specific, no marketing register. Match it.

## Files

- `Meal Magic identity.dc.html` — the design, and the source of truth. Six labelled frames: Identity, Recipes, Recipe, This week, Pantry, Household. Open in a browser and scroll. Inspect it for any measurement not written down here.
- `before-recipes-screen.png` — the current Recipes list, for comparison.
- `screens/` — a 1440px-wide PNG per frame, for reference while implementing:
  - `01-identity.png` — wordmark, palette, type pairing
  - `02-recipes.png` — Recipes list
  - `03-recipe.png` — Recipe detail
  - `04-this-week.png` — Plan and shopping list
  - `05-pantry.png` — Pantry
  - `06-household.png` — Household

## Suggested order of work

1. Theme first: fonts in `layout.tsx`, then palette, typography and `shape.borderRadius: 0` in `theme.ts`, plus `MuiCard`/`MuiChip`/`MuiButton` overrides. Several screens improve here alone.
2. `TopBar` — the wordmark and nav set the tone everywhere.
3. Recipes list — the most structural change (collections, hero, borderless cards).
4. Recipe detail.
5. This week, Pantry, Household — largely restyling.
