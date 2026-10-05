"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A Button that navigates.
 *
 * MUI's `component={Link}` passes a component function as a prop, which a
 * server component cannot send across the RSC boundary - it typechecks and
 * builds, then fails at request time. Doing it inside a client component keeps
 * that prop on one side of the boundary, so server pages can link freely.
 */
export function LinkButton({
  href,
  children,
  transitionTypes,
  ...buttonProps
}: {
  href: string;
  children: ReactNode;
  /**
   * Which direction this navigation counts as, for `PageTransition`.
   *
   * Passed through to the `Link` underneath rather than to the Button: MUI
   * forwards what it does not recognise to the component it was given, but
   * naming it here keeps it out of `ButtonProps` and off the DOM node.
   */
  transitionTypes?: string[];
} & Omit<ButtonProps, "href">) {
  return (
    <Button
      component={Link}
      href={href}
      transitionTypes={transitionTypes}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
