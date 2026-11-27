"use client";

import { useEffect, useState } from "react";
import { ProductCard, type CardModel } from "@/components/store/product-card";
import { api } from "@/lib/api-client";

const KEY = "gg_recent";

export function rememberProduct(id: string) {
  const current = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
  const next = [id, ...current.filter((item) => item !== id)].slice(0, 8);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const [items, setItems] = useState<CardModel[]>([]);
  useEffect(() => {
    const ids = (JSON.parse(localStorage.getItem(KEY) || "[]") as string[]).filter((id) => id !== excludeId);
    if (ids.length === 0) return;
    void api<{ items: CardModel[] }>(`/api/products?ids=${ids.join(",")}`)
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [excludeId]);
  if (items.length === 0) return null;
  return (
    <section className="grid gap-4">
      <h2 className="text-2xl font-medium">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function Remember({ id }: { id: string }) {
  useEffect(() => rememberProduct(id), [id]);
  return null;
}
