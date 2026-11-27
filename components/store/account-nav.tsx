"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  ["/account", "Profile"],
  ["/account/orders", "Orders"],
  ["/account/addresses", "Addresses"],
  ["/wishlist", "Wishlist"],
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="grid content-start gap-2 text-sm">
      {links.map(([href, label]) => {
        const active =
          href === "/account"
            ? pathname === "/account"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
