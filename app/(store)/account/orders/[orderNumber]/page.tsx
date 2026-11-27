"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { OrderTimeline } from "@/components/store/order-timeline";
import { Money } from "@/components/store/money";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/order-state";

type Order = {
  orderNumber: string;
  status: OrderStatus;
  grandTotal: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  email: string;
  payment: { method: string; status: string; amount: string } | null;
  shipment: { carrier: string | null; trackingNumber: string | null } | null;
  items: { id: string; productName: string; quantity: number; unitPrice: string }[];
  shippingAddress: { fullName: string; line1: string; city: string; state: string; postalCode: string };
};

export default function OrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    void api<Order>(`/api/orders/${params.orderNumber}`).then(setOrder).catch((error) => toast.error(error.message));
  }, [params.orderNumber]);

  async function cancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") || "");
    try {
      setOrder(await api(`/api/orders/${params.orderNumber}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) }));
      toast.success("Order cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel.");
    }
  }

  async function requestReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") || "");
    try {
      setOrder(await api(`/api/orders/${params.orderNumber}/returns`, { method: "POST", body: JSON.stringify({ reason }) }));
      toast.success("Return requested");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request a return.");
    }
  }

  if (!order) return <div className="h-48 animate-pulse rounded-3xl bg-muted" />;
  const address = order.shippingAddress;
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-medium">{order.orderNumber}</h1>
      <OrderTimeline status={order.status} />
      <ul className="grid gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <Money value={item.unitPrice} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {address.fullName}, {address.line1}, {address.city}, {address.state} {address.postalCode}
      </p>
      <p className="text-sm">
        Payment {order.payment?.method} · {order.payment?.status} · <Money value={order.grandTotal} />
      </p>
      {order.shipment?.trackingNumber ? (
        <p className="text-sm">
          {order.shipment.carrier}: {order.shipment.trackingNumber}
        </p>
      ) : null}
      {["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status) ? (
        <form onSubmit={cancel} className="grid max-w-lg gap-2">
          <label htmlFor="cancel-reason" className="text-sm">
            Cancel this order
          </label>
          <Textarea id="cancel-reason" name="reason" required minLength={3} placeholder="Reason" />
          <Button type="submit" variant="outline">
            Cancel order
          </Button>
        </form>
      ) : null}
      {order.status === "DELIVERED" ? (
        <form onSubmit={requestReturn} className="grid max-w-lg gap-2">
          <label htmlFor="return-reason" className="text-sm">
            Request a return
          </label>
          <Textarea id="return-reason" name="reason" required minLength={10} placeholder="Tell us what happened" />
          <Button type="submit" variant="outline">
            Request return
          </Button>
        </form>
      ) : null}
    </div>
  );
}
