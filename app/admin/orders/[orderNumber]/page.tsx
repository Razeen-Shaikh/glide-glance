"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Money } from "@/components/store/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/order-state";

type Order = {
  orderNumber: string;
  email: string;
  status: OrderStatus;
  grandTotal: string;
  customer: { name: string | null; email: string; phone: string | null } | null;
  payment: { method: string; status: string; razorpayPaymentId: string | null; refundId: string | null } | null;
  items: { id: string; productName: string; sku: string; quantity: number }[];
  shippingAddress: { fullName: string; line1: string; city: string; state: string; postalCode: string; phone: string };
  returnRequest: { reason: string; status: string } | null;
};

export default function AdminOrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    void api<Order>(`/api/admin/orders/${params.orderNumber}`).then(setOrder);
  }, [params.orderNumber]);
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      setOrder(await api(`/api/admin/orders/${params.orderNumber}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: data.get("status"),
          carrier: data.get("carrier"),
          trackingNumber: data.get("trackingNumber"),
          note: data.get("note"),
        }),
      }));
      toast.success("Order updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the order.");
    }
  }
  async function decide(decision: "approve" | "reject") {
    try {
      setOrder(await api(`/api/admin/orders/${params.orderNumber}/return`, { method: "POST", body: JSON.stringify({ decision }) }));
      toast.success(decision === "approve" ? "Return approved" : "Return rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the return.");
    }
  }
  if (!order) return <div className="h-40 animate-pulse rounded-3xl bg-muted" />;
  const address = order.shippingAddress;
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-medium">{order.orderNumber}</h1>
      <p>{order.customer?.name || address.fullName} · {order.email} · {address.phone}</p>
      <p className="text-sm text-muted-foreground">{address.line1}, {address.city}, {address.state} {address.postalCode}</p>
      <p>Payment {order.payment?.method} · {order.payment?.status} · <Money value={order.grandTotal} /></p>
      {order.payment?.razorpayPaymentId ? <p className="text-sm">Razorpay {order.payment.razorpayPaymentId}</p> : null}
      <ul className="text-sm">{order.items.map((item) => <li key={item.id}>{item.productName} · {item.sku} × {item.quantity}</li>)}</ul>
      <form onSubmit={update} className="grid max-w-lg gap-3">
        <label className="grid gap-1 text-sm" htmlFor="status">Status
          <select id="status" name="status" defaultValue={order.status} className="h-11 rounded-xl border border-input bg-card px-3">
            {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm" htmlFor="carrier">Carrier <Input id="carrier" name="carrier" /></label>
        <label className="grid gap-1 text-sm" htmlFor="trackingNumber">Tracking number <Input id="trackingNumber" name="trackingNumber" /></label>
        <label className="grid gap-1 text-sm" htmlFor="note">Note <Input id="note" name="note" /></label>
        <Button type="submit">Update status</Button>
      </form>
      {order.returnRequest ? (
        <div className="rounded-2xl border border-border p-4">
          <p className="font-medium">Return {order.returnRequest.status}</p>
          <p className="mt-2 text-sm">{order.returnRequest.reason}</p>
          {order.status === "RETURN_REQUESTED" ? (
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => decide("approve")}>Approve refund</Button>
              <Button type="button" variant="outline" onClick={() => decide("reject")}>Reject</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
