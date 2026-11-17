import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { BackToTop } from "@/components/shared/back-to-top";

/** Shared chrome (navbar, footer, back-to-top) for every public marketing page. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
