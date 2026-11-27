"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductCard, type CardModel } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

type Item = { id: string; product: CardModel };

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    void api<Item[]>("/api/wishlist").then(setItems).catch((error) => toast.error(error.message));
  }, []);
  async function remove(id: string) {
    setItems(await api<Item[]>(`/api/wishlist/${id}`, { method: "DELETE" }));
  }
  async function move(id: string) {
    try {
      setItems(await api<Item[]>(`/api/wishlist/${id}/move`, { method: "POST" }));
      toast.success("Moved to cart");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move this piece.");
    }
  }
  if (!items) return <div className="h-48 animate-pulse rounded-3xl bg-muted" />;
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-medium">Wishlist</h1>
      {items.length === 0 ? <p className="text-muted-foreground">Nothing saved yet.</p> : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="grid gap-2">
            <ProductCard product={item.product} />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => move(item.id)}>
                Move to cart
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => remove(item.id)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
