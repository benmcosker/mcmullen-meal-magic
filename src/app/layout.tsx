import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Magic",
  description:
    "Recipe box, weekly meal planner and grocery list for the McMullen household.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
