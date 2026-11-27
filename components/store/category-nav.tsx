"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Category = { name: string; slug: string };

export function CategoryNav({
  categories,
  className,
  linkClassName,
  onNavigate,
}: {
  categories: Category[];
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onShop = pathname === "/products" || pathname.startsWith("/products/");
  const activeSlug = pathname === "/products" ? searchParams.get("category") : null;
  const allActive = pathname === "/products" && !activeSlug;

  return (
    <nav aria-label="Categories" className={className}>
      <Link
        href="/products"
        onClick={onNavigate}
        aria-current={allActive ? "page" : undefined}
        className={cn(
          linkClassName,
          allActive ? "font-medium text-foreground" : "text-muted-foreground transition hover:text-foreground",
        )}
      >
        All
      </Link>
      {categories.map((category) => {
        const active = onShop && activeSlug === category.slug;
        return (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              linkClassName,
              active ? "font-medium text-foreground" : "text-muted-foreground transition hover:text-foreground",
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
