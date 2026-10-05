import { ViewTransition } from "react";

/**
 * Which way the page moved.
 *
 * Going into a recipe, the library leaves to the left and the recipe arrives
 * from the right. Coming back, both reverse. Horizontal direction is the one
 * piece of motion grammar people already read without being taught it:
 * leftward is onward, rightward is back.
 *
 * The direction is not inferred - it is declared, by the link that was
 * clicked, through `transitionTypes`. A link into a recipe says `nav-forward`
 * and the back link says `nav-back`. Nothing else is tagged, and `default:
 * "none"` means everything else - a browser back button, `router.refresh()`,
 * a Suspense reveal - moves no page at all. A transition that fires on
 * navigations nobody thinks of as navigation is worse than none.
 *
 * ## Why this is a component rather than two copies of the props
 *
 * The mapping has to be identical on both pages or the pair reads as two
 * different animations, and it is twelve lines of object literal that would
 * otherwise be written twice and edited once.
 *
 * It still has to be used **in each page**, not in a layout. Layouts persist
 * across navigation within them, so a wrapper there never enters or exits and
 * the animation simply never plays.
 *
 * ## It does not replace the photo morph
 *
 * A dish photo named on both ends is lifted into its own transition group and
 * animates independently of the page it sits in - so the photo travels while
 * the rest of the page slides. The two are separate mechanisms that happen to
 * run at the same moment.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const directions = {
    "nav-forward": "nav-forward",
    "nav-back": "nav-back",
    default: "none",
  } as const;

  return (
    <ViewTransition enter={directions} exit={directions} default="none">
      {children}
    </ViewTransition>
  );
}
