"use client";

import { useEffect, useState } from "react";
import { Money } from "@/components/store/money";
import { api } from "@/lib/api-client";

type Dashboard = {
  revenue: string;
  orders: number;
  customers: number;
  products: number;
  pendingOrders: number;
  lowStock: { sku: string; productName: string; available: number; threshold: number }[];
  recentOrders: { orderNumber: string; status: string; grandTotal: string; email: string }[];
  revenueByDay: { date: string; totalPaise: number }[];
  bestSellers: { name: string; units: number }[];
  customerGrowth: { week: string; count: number }[];
  statusCounts: Record<string, number>;
};

export default function AdminHome() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<Dashboard>("/api/admin/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);
  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-muted" />;
  const max = Math.max(...data.revenueByDay.map((day) => day.totalPaise), 1);
  const cards = [
    ["Revenue", data.revenue, true],
    ["Orders", String(data.orders), false],
    ["Customers", String(data.customers), false],
    ["Products", String(data.products), false],
    ["Pending", String(data.pendingOrders), false],
  ] as const;
  return (
    <div className="grid gap-8">
      <h1 className="text-3xl font-medium">Overview</h1>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value, money]) => (
          <article key={label} className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-medium">{money ? <Money value={value} /> : value}</p>
          </article>
        ))}
      </section>
      <section>
        <h2 className="font-medium">Revenue, last 14 days</h2>
        <svg role="img" aria-label="Revenue by day in rupees" viewBox="0 0 560 160" className="mt-3 h-40 w-full">
          {data.revenueByDay.map((day, index) => {
            const height = (day.totalPaise / max) * 120;
            return <rect key={day.date} x={index * 40 + 8} y={140 - height} width="24" height={height} className="fill-primary" rx="4">
              <title>{`${day.date}: ₹${(day.totalPaise / 100).toFixed(0)}`}</title>
            </rect>;
          })}
        </svg>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-medium">Recent orders</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.recentOrders.map((order) => (
              <li key={order.orderNumber} className="flex justify-between gap-3">
                <span>{order.orderNumber} · {order.status}</span>
                <Money value={order.grandTotal} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-medium">Low stock</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.lowStock.length === 0 ? <li>Stock levels are healthy.</li> : null}
            {data.lowStock.map((row) => (
              <li key={row.sku}>{row.productName} · {row.sku} · {row.available} left</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-medium">Best sellers</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.bestSellers.map((product) => (
              <li key={product.name} className="flex justify-between"><span>{product.name}</span><span>{product.units} sold</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-medium">Customer growth</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {data.customerGrowth.map((week) => (
              <li key={week.week} className="flex justify-between"><span>Week of {week.week}</span><span>{week.count}</span></li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
