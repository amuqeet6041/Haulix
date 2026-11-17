import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { JsonLd } from "@/components/shared/json-ld";
import { defaultMetadata, defaultViewport } from "@/config/metadata";
import { organizationJsonLd } from "@/lib/seo";

import "./globals.css";

/** Body copy. Self-hosted at build time by next/font (no runtime requests to Google). */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
/** Headings (`font-display`). */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = defaultMetadata;
export const viewport: Viewport = defaultViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <JsonLd data={organizationJsonLd()} />
        {children}
      </body>
    </html>
  );
}
