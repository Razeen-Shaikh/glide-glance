"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Money } from "@/components/store/money";
import { api } from "@/lib/api-client";

type Order = { orderNumber: string; status: string; grandTotal: string; createdAt: string };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    void api<Order[]>("/api/orders").then(setOrders);
  }, []);
  if (!orders) return <div className="h-40 animate-pulse rounded-3xl bg-muted" />;
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-medium">Orders</h1>
      {orders.length === 0 ? <p className="text-muted-foreground">You have not placed an order yet.</p> : null}
      {orders.map((order) => (
        <Link key={order.orderNumber} href={`/account/orders/${order.orderNumber}`} className="flex items-center justify-between rounded-2xl border border-border p-4">
          <span>
            <span className="font-medium">{order.orderNumber}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{order.status.replaceAll("_", " ")}</span>
          </span>
          <Money value={order.grandTotal} />
        </Link>
      ))}
    </div>
  );
}
