"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { CategoryNav } from "@/components/store/category-nav";
import { LiveSearch } from "@/components/store/live-search";

export function MobileNav({ categories }: { categories: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" className="rounded-md p-2 hover:bg-muted" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-background/95 p-5 backdrop-blur-md motion-fade">
          <div className="flex items-center justify-between">
            <p className="font-display text-xl font-semibold">Glide Glance</p>
            <button type="button" aria-label="Close menu" className="rounded-md p-2 hover:bg-muted" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6">
            <label htmlFor="mobile-search" className="sr-only">
              Search products
            </label>
            <LiveSearch
              id="mobile-search"
              placeholder="Search"
              aria-label="Search products"
              className="h-11 w-full rounded-md border border-input bg-card px-3"
            />
          </div>
          <CategoryNav
            categories={categories}
            className="mt-8 grid gap-4 font-display text-2xl font-medium"
            onNavigate={() => setOpen(false)}
          />
          <Link href="/account" className="mt-6 block text-lg text-muted-foreground" onClick={() => setOpen(false)}>
            Account
          </Link>
        </div>
      ) : null}
    </div>
  );
}
