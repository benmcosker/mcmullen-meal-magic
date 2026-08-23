"use client";

import KitchenIcon from "@mui/icons-material/Kitchen";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Chip, { type ChipProps } from "@mui/material/Chip";

/**
 * A Chip with an icon, safe to use from a server component.
 *
 * Chip clones the element passed to its `icon` prop to attach a class, and
 * React.cloneElement on a client-component element inside a server component
 * produces an element with no type - which the server then drops. The result
 * renders on the client but not on the server, so the page hydrates with a
 * mismatch and React throws the whole subtree away and rebuilds it.
 *
 * The same trap as Stack's `divider` prop, noted on the ingredients list. The
 * fix is the same shape as LinkButton: name the icon across the boundary and
 * let the client pick the component, so the cloning happens where both renders
 * agree.
 */
const icons = {
  oven: LocalFireDepartmentIcon,
  equipment: KitchenIcon,
  pdf: PictureAsPdfIcon,
} as const;

export type ChipIconName = keyof typeof icons;

/**
 * `component` and the anchor attributes that come with it are typed loosely
 * here: Chip's own generic overload cannot be expressed through a wrapper
 * without dragging its whole polymorphic signature along, and the only caller
 * that needs it is the one linking to a PDF.
 */
export function IconChip({
  icon,
  ...props
}: { icon: ChipIconName } & Omit<ChipProps, "icon"> &
  Partial<
    Pick<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      "href" | "target" | "rel"
    >
  >) {
  const Icon = icons[icon];
  return <Chip icon={<Icon />} {...props} />;
}
