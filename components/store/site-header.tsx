import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Heart, ShoppingBag, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readGuestToken } from "@/lib/guest";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { MobileNav } from "@/components/store/mobile-nav";
import { CategoryNav } from "@/components/store/category-nav";
import { LiveSearch } from "@/components/store/live-search";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center gap-5 px-4">
        <MobileNavSlot />
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Glide Glance
        </Link>
        <div className="hidden min-w-0 flex-1 md:block">
          <label htmlFor="search" className="sr-only">
            Search products
          </label>
          <Suspense fallback={<div className="h-10 rounded-md border border-input bg-card/80" />}>
            <LiveSearch
              id="search"
              placeholder="Search linen, lamps, leather…"
              aria-label="Search products"
              className="h-10 w-full rounded-md border border-input bg-card/80 px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Suspense>
        </div>
        <nav aria-label="Account" className="ml-auto flex items-center gap-0.5">
          <ThemeToggle />
          <Link href="/wishlist" aria-label="Wishlist" className="rounded-md p-2.5 hover:bg-muted">
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative rounded-md p-2.5 hover:bg-muted">
            <ShoppingBag className="h-5 w-5" />
            <Suspense fallback={null}>
              <CartCount />
            </Suspense>
          </Link>
          <Suspense fallback={<UserLink href="/login" label="Account" />}>
            <AccountLink />
          </Suspense>
        </nav>
      </div>
      <Suspense fallback={<div className="h-11 border-t border-border/70" />}>
        <CategoryBar />
      </Suspense>
    </header>
  );
}

function UserLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
      <UserRound className="h-5 w-5" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

async function AccountLink() {
  await connection();
  const user = await getCurrentUser();
  if (!user) return <UserLink href="/login" label="Sign in" />;
  return <UserLink href="/account" label={user.name?.split(" ")[0] || "Account"} />;
}

async function CartCount() {
  await connection();
  const user = await getCurrentUser();
  const guestToken = await readGuestToken();
  if (!user && !guestToken) return null;
  const cart = await prisma.cart.findUnique({
    where: user ? { userId: user.id } : { guestToken: guestToken! },
    include: { items: true },
  });
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  if (!count) return null;
  return (
    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-sm bg-primary px-1 text-[10px] font-medium text-primary-foreground">
      {count}
    </span>
  );
}

async function CategoryBar() {
  await connection();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } });
  return (
    <CategoryNav
      categories={categories}
      className="mx-auto hidden max-w-6xl gap-6 px-4 pb-3 text-sm md:flex"
    />
  );
}

function MobileNavSlot() {
  return (
    <Suspense fallback={null}>
      <MobileNavLoader />
    </Suspense>
  );
}

async function MobileNavLoader() {
  await connection();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } });
  return <MobileNav categories={categories} />;
}
