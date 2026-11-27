"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

type Row = {
  variantId: string;
  sku: string;
  productName: string;
  attributes: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  low: boolean;
  transactions: { id: string; reason: string; quantity: number; createdAt: string }[];
};

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  async function load() {
    setRows(await api("/api/admin/inventory"));
  }
  useEffect(() => {
    void load();
  }, []);
  async function adjust(event: FormEvent<HTMLFormElement>, variantId: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/admin/inventory", { method: "POST", body: JSON.stringify({ variantId, delta: Number(data.get("delta")), note: data.get("note") }) });
      toast.success("Inventory updated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not adjust stock.");
    }
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-medium">Inventory</h1>
      {rows.map((row) => (
        <article key={row.variantId} className="rounded-2xl border border-border p-4">
          <p className="font-medium">{row.productName} · {row.sku}</p>
          <p className="text-sm text-muted-foreground">{row.attributes || "No attributes"} {row.low ? "· Low stock" : ""}</p>
          <p className="mt-2 text-sm">On hand {row.quantityOnHand} · Reserved {row.quantityReserved} · Available {row.quantityAvailable}</p>
          <form onSubmit={(event) => adjust(event, row.variantId)} className="mt-3 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`delta-${row.variantId}`}>Quantity change</label>
            <Input id={`delta-${row.variantId}`} name="delta" type="number" required placeholder="+ or -" className="w-28" />
            <Input name="note" placeholder="Note" className="max-w-xs" />
            <Button type="submit" size="sm">Update</Button>
          </form>
          <ul className="mt-3 text-xs text-muted-foreground">
            {row.transactions.map((entry) => <li key={entry.id}>{entry.reason} {entry.quantity} · {entry.createdAt.slice(0, 10)}</li>)}
          </ul>
        </article>
      ))}
    </div>
  );
}
