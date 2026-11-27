import type { ReactNode } from "react";
import { BagSync } from "@/components/store/bag-sync";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col overflow-x-clip">
      <BagSync />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8 md:py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
