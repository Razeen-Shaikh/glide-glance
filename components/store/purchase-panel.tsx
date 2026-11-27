"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { Money } from "@/components/store/money";

type Variant = {
  id: string;
  name: string;
  price: string;
  available: number;
  attributes: { name: string; value: string }[];
};

export function PurchasePanel({ productId, variants }: { productId: string; variants: Variant[] }) {
  const router = useRouter();
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const variant of variants) {
      for (const attribute of variant.attributes) {
        const values = map.get(attribute.name) ?? [];
        if (!values.includes(attribute.value)) values.push(attribute.value);
        map.set(attribute.name, values);
      }
    }
    return [...map.entries()];
  }, [variants]);
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [name, values] of groups) {
      const value = values[0];
      if (value) initial[name] = value;
    }
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const match =
    variants.find((variant) => variant.attributes.every((attribute) => selected[attribute.name] === attribute.value)) ??
    variants[0];

  async function add(redirect: boolean) {
    if (!match) return;
    setPending(true);
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ variantId: match.id, quantity }),
      });
      toast.success("Added to cart");
      router.refresh();
      if (redirect) router.push("/checkout");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add to cart.");
    } finally {
      setPending(false);
    }
  }

  async function save() {
    try {
      await api("/api/wishlist", { method: "POST", body: JSON.stringify({ productId }) });
      toast.success("Saved to wishlist");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    }
  }

  if (!match) return <p>This piece is unavailable.</p>;

  return (
    <div className="grid gap-5">
      <div>
        <Money value={match.price} className="text-2xl font-medium" />
        <p className="mt-1 text-sm text-muted-foreground">{match.available > 0 ? `${match.available} in stock` : "Out of stock"}</p>
      </div>
      {groups.map(([name, values]) => (
        <fieldset key={name} className="grid gap-2">
          <legend className="text-sm font-medium">{name}</legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={selected[name] === value}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${selected[name] === value ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
                onClick={() => setSelected((current) => ({ ...current, [name]: value }))}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={Math.min(10, Math.max(match.available, 1))}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="h-11 w-20 rounded-md border border-input bg-card px-3"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={pending || match.available < 1} onClick={() => add(false)}>
          Add to cart
        </Button>
        <Button type="button" variant="secondary" disabled={pending || match.available < 1} onClick={() => add(true)}>
          Buy now
        </Button>
        <Button type="button" variant="outline" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
