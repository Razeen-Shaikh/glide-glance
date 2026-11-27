"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type LiveSearchProps = {
  id: string;
  name?: string;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
};

export function LiveSearch({ id, name = "q", className, placeholder, "aria-label": ariaLabel }: LiveSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [value, setValue] = useState(qFromUrl);

  useEffect(() => {
    setValue(qFromUrl);
  }, [qFromUrl]);

  const commitSearch = useEffectEvent((nextValue: string) => {
    const trimmed = nextValue.trim();
    const current = searchParams.get("q") ?? "";
    if (trimmed === current) return;

    const next = new URLSearchParams(pathname.startsWith("/products") ? searchParams.toString() : "");
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.delete("page");

    const query = next.toString();
    router.replace(query ? `/products?${query}` : "/products", { scroll: false });
  });

  useEffect(() => {
    if (value === qFromUrl) return;
    const timer = window.setTimeout(() => commitSearch(value), 300);
    return () => window.clearTimeout(timer);
  }, [value, qFromUrl, commitSearch]);

  return (
    <input
      id={id}
      name={name}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      autoComplete="off"
      className={className}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
