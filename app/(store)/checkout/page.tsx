"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Quote } from "@/app/(store)/cart/page";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

type CartView = {
  items: { id: string }[];
  quote: { subtotal: string; discount: string; shipping: string; tax: string; grand: string; couponMessage: string | null };
};

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [delivery, setDelivery] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api<CartView>(`/api/cart?delivery=${delivery}`).then(setCart).catch((error) => toast.error(error.message));
    void api<Address[]>("/api/account/addresses").then(setAddresses).catch(() => setAddresses([]));
  }, [delivery]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const shipping = {
      fullName: String(data.get("fullName") || ""),
      phone: String(data.get("phone") || ""),
      line1: String(data.get("line1") || ""),
      line2: String(data.get("line2") || ""),
      city: String(data.get("city") || ""),
      state: String(data.get("state") || ""),
      postalCode: String(data.get("postalCode") || ""),
      country: "IN" as const,
      isDefault: data.get("isDefault") === "on",
    };
    setPending(true);
    try {
      const order = await api<{
        orderNumber: string;
        paymentMethod: "COD" | "RAZORPAY";
        razorpayOrderId: string | null;
        razorpayKeyId: string | null;
        amountPaise: number;
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          shipping,
          billingSame: true,
          deliveryOption: delivery,
          paymentMethod: data.get("paymentMethod"),
          notes: data.get("notes") || "",
          saveAddress: data.get("saveAddress") === "on",
        }),
      });
      if (order.paymentMethod === "COD") {
        router.refresh();
        router.push(`/checkout/confirmation/${order.orderNumber}`);
        return;
      }
      await openRazorpay(order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setPending(false);
    }
  }

  async function openRazorpay(order: { orderNumber: string; razorpayOrderId: string | null; razorpayKeyId: string | null; amountPaise: number }) {
    if (!order.razorpayOrderId || !order.razorpayKeyId) {
      toast.error("Online payment is not configured.");
      return;
    }
    await loadRazorpay();
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value;
    const checkout = new window.Razorpay!({
      key: order.razorpayKeyId,
      amount: order.amountPaise,
      currency: "INR",
      order_id: order.razorpayOrderId,
      name: "Glide Glance",
      description: order.orderNumber,
      prefill: { email },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          await api("/api/payments/verify", { method: "POST", body: JSON.stringify(response) });
          router.refresh();
          router.push(`/checkout/confirmation/${order.orderNumber}`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Payment could not be verified.");
        }
      },
    });
    checkout.open();
  }

  const saved = addresses.find((address) => address.isDefault) ?? addresses[0];

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <h1 className="text-3xl font-medium">Checkout</h1>
        <section className="grid gap-3">
          <h2 className="font-medium">Contact</h2>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
        </section>
        <section className="grid gap-3">
          <h2 className="font-medium">Shipping address</h2>
          {saved ? <p className="text-sm text-muted-foreground">Saved address filled in. You can edit it before placing the order.</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" required defaultValue={saved?.fullName} autoComplete="name" />
            </Field>
            <Field label="Mobile" htmlFor="phone">
              <Input id="phone" name="phone" required defaultValue={saved?.phone} autoComplete="tel" />
            </Field>
            <Field label="Address" htmlFor="line1">
              <Input id="line1" name="line1" required defaultValue={saved?.line1} className="sm:col-span-2" />
            </Field>
            <Field label="Apartment, suite (optional)" htmlFor="line2">
              <Input id="line2" name="line2" defaultValue={saved?.line2 ?? ""} />
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" required defaultValue={saved?.city} />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" required defaultValue={saved?.state} />
            </Field>
            <Field label="PIN code" htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" required defaultValue={saved?.postalCode} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="saveAddress" /> Save this address
          </label>
        </section>
        <fieldset className="grid gap-2">
          <legend className="font-medium">Delivery</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="delivery" checked={delivery === "STANDARD"} onChange={() => setDelivery("STANDARD")} />
            Standard · ₹49, free over ₹999
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="delivery" checked={delivery === "EXPRESS"} onChange={() => setDelivery("EXPRESS")} />
            Express · ₹99
          </label>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="font-medium">Payment</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="paymentMethod" value="RAZORPAY" defaultChecked />
            UPI, cards, net banking, or wallets
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="paymentMethod" value="COD" />
            Cash on delivery
          </label>
        </fieldset>
        <Field label="Order notes" htmlFor="notes">
          <Input id="notes" name="notes" />
        </Field>
        <Button type="submit" disabled={pending || !cart?.items.length}>
          {pending ? "Placing order…" : "Place order"}
        </Button>
      </div>
      <aside className="h-fit rounded-2xl border border-border p-5">
        <h2 className="font-medium">Order summary</h2>
        {cart ? <Quote quote={cart.quote} /> : <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" />}
      </aside>
    </form>
  );
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout failed to load."));
    document.body.appendChild(script);
  });
}
