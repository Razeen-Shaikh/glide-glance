"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/store/money";
import { api } from "@/lib/api-client";

type CartView = {
  items: {
    id: string;
    quantity: number;
    unitPrice: string;
    available: number;
    variant: { name: string; attributes: { name: string; value: string }[] };
    product: { name: string; slug: string; image: string | null };
  }[];
  couponCode: string | null;
  couponError: string | null;
  quote: { subtotal: string; discount: string; shipping: string; tax: string; grand: string; couponMessage: string | null };
};

export default function CartPage() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setCart(await api<CartView>("/api/cart"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the cart.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function update(id: string, quantity: number) {
    try {
      setCart(await api<CartView>(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update quantity.");
    }
  }

  async function remove(id: string) {
    setCart(await api<CartView>(`/api/cart/items/${id}`, { method: "DELETE" }));
  }

  async function applyCoupon(formData: FormData) {
    try {
      setCart(await api<CartView>("/api/cart/coupon", { method: "POST", body: JSON.stringify({ code: formData.get("code") }) }));
      toast.success("Coupon applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Coupon was not applied.");
    }
  }

  if (error) return <p className="text-destructive">{error}</p>;
  if (!cart) return <div className="h-64 animate-pulse bg-muted" />;
  if (cart.items.length === 0) {
    return (
      <div className="grid gap-3 py-16 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="text-muted-foreground">The edit is waiting when you are.</p>
        <Link href="/products" className="text-sm underline underline-offset-4">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Cart</h1>
        {cart.items.map((item) => (
          <article key={item.id} className="grid grid-cols-[96px_1fr] gap-4 border-b border-border py-4">
            <div className="relative aspect-square overflow-hidden bg-muted">
              {item.product.image ? <Image src={item.product.image} alt="" fill className="object-cover" sizes="96px" /> : null}
            </div>
            <div className="grid gap-2">
              <Link href={`/products/${item.product.slug}`} className="font-display text-lg font-medium">
                {item.product.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {item.variant.attributes.map((attribute) => attribute.value).join(" / ") || item.variant.name}
              </p>
              <Money value={item.unitPrice} />
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`qty-${item.id}`}>
                  Quantity
                </label>
                <input
                  id={`qty-${item.id}`}
                  type="number"
                  min={1}
                  max={Math.min(10, item.available)}
                  defaultValue={item.quantity}
                  className="h-10 w-16 rounded-md border border-input px-2"
                  onBlur={(event) => update(item.id, Number(event.target.value))}
                />
                <button type="button" className="text-sm underline underline-offset-4" onClick={() => remove(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <aside className="h-fit border border-border bg-card/60 p-5">
        <h2 className="font-display text-xl font-semibold">Summary</h2>
        <Quote quote={cart.quote} />
        <form action={applyCoupon} className="mt-4 flex gap-2">
          <label htmlFor="coupon" className="sr-only">
            Coupon
          </label>
          <input id="coupon" name="code" defaultValue={cart.couponCode ?? ""} placeholder="Coupon" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm" />
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
        {cart.couponError ? <p className="mt-2 text-sm text-destructive">{cart.couponError}</p> : null}
        {cart.quote.couponMessage ? <p className="mt-2 text-sm text-muted-foreground">{cart.quote.couponMessage}</p> : null}
        <Button asChild className="mt-4 w-full">
          <Link href="/checkout">Checkout</Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">Shipping shown is standard. Express is available at checkout. GST is included in prices.</p>
      </aside>
    </div>
  );
}

export function Quote({ quote }: { quote: CartView["quote"] }) {
  const rows = [
    ["Subtotal", quote.subtotal],
    ["Discount", quote.discount],
    ["Shipping", quote.shipping],
    ["GST included", quote.tax],
  ] as const;
  return (
    <dl className="mt-4 grid gap-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>
            <Money value={value} />
          </dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
        <dt>Total</dt>
        <dd>
          <Money value={quote.grand} />
        </dd>
      </div>
    </dl>
  );
}
