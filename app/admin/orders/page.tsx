"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Money } from "@/components/store/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

type Order = { orderNumber: string; email: string; status: string; grandTotal: string };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  async function load(q = query, status = "") {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    setOrders(await api(`/api/admin/orders?${params.toString()}`));
  }
  useEffect(() => {
    void load();
  }, []);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void load(String(data.get("q") || ""), String(data.get("status") || ""));
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-medium">Orders</h1>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="order-search">Search orders</label>
        <Input id="order-search" name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number or email" />
        <select name="status" className="h-11 rounded-xl border border-input bg-card px-3" aria-label="Status">
          <option value="">All statuses</option>
          {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <Button type="submit">Filter</Button>
      </form>
      <ul className="grid gap-2">
        {orders.map((order) => (
          <li key={order.orderNumber}>
            <Link href={`/admin/orders/${order.orderNumber}`} className="flex justify-between rounded-2xl border border-border p-4">
              <span>{order.orderNumber}<span className="block text-sm text-muted-foreground">{order.email} · {order.status}</span></span>
              <Money value={order.grandTotal} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
