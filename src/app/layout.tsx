import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Providers } from "@/theme/Providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Meal Magic",
  description:
    "Recipe box, weekly meal planner and grocery list for the McMullen household.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
