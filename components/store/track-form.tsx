"use client";

import { FormEvent, useState } from "react";
import { OrderTimeline } from "@/components/store/order-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/order-state";

export function TrackForm({ orderNumber = "" }: { orderNumber?: string }) {
  const [order, setOrder] = useState<{ orderNumber: string; status: OrderStatus; shipment: { trackingNumber: string | null; carrier: string | null } | null } | null>(null);
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      const params = new URLSearchParams({
        orderNumber: String(data.get("orderNumber") || ""),
        email: String(data.get("email") || ""),
      });
      setOrder(await api(`/api/orders/track?${params.toString()}`));
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Order not found.");
    }
  }
  return (
    <div className="grid max-w-lg gap-4">
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-sm" htmlFor="track-number">
          Order number
          <Input id="track-number" name="orderNumber" defaultValue={orderNumber} required />
        </label>
        <label className="grid gap-1 text-sm" htmlFor="track-email">
          Email
          <Input id="track-email" name="email" type="email" required />
        </label>
        <Button type="submit">Track order</Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {order ? (
        <div className="grid gap-3">
          <p className="font-medium">{order.orderNumber}</p>
          <OrderTimeline status={order.status} />
          {order.shipment?.trackingNumber ? (
            <p className="text-sm text-muted-foreground">
              {order.shipment.carrier}: {order.shipment.trackingNumber}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
