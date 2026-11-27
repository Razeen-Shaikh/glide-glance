"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

type Customer = { id: string; name: string | null; email: string; isActive: boolean; _count: { orders: number } };
type Detail = { orders: { orderNumber: string; status: string; grandTotal: string }[] };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  async function load(q = "") {
    setCustomers(await api(`/api/admin/customers?q=${encodeURIComponent(q)}`));
  }
  useEffect(() => {
    void load();
  }, []);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(String(new FormData(event.currentTarget).get("q") || ""));
  }
  async function toggle(customer: Customer) {
    await api(`/api/admin/customers/${customer.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !customer.isActive }) });
    toast.success(customer.isActive ? "Account deactivated" : "Account activated");
    await load();
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-medium">Customers</h1>
      <form onSubmit={search} className="flex gap-2">
        <label className="sr-only" htmlFor="customer-search">Search customers</label>
        <Input id="customer-search" name="q" placeholder="Name or email" />
        <Button type="submit">Search</Button>
      </form>
      <ul className="grid gap-2">
        {customers.map((customer) => (
          <li key={customer.id} className="flex items-center justify-between rounded-2xl border border-border p-4">
            <button type="button" className="text-left" onClick={() => api<Detail>(`/api/admin/customers/${customer.id}`).then(setDetail)}>
              <span className="font-medium">{customer.name || customer.email}</span>
              <span className="block text-sm text-muted-foreground">{customer.email} · {customer._count.orders} orders · {customer.isActive ? "Active" : "Inactive"}</span>
            </button>
            <Button type="button" variant="outline" size="sm" onClick={() => toggle(customer)}>{customer.isActive ? "Deactivate" : "Activate"}</Button>
          </li>
        ))}
      </ul>
      {detail ? (
        <div className="rounded-2xl border border-border p-4 text-sm">
          <p className="font-medium">Purchase history</p>
          <ul className="mt-2 grid gap-1">{detail.orders.map((order) => <li key={order.orderNumber}>{order.orderNumber} · {order.status} · {order.grandTotal}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
