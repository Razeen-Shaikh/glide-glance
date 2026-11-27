"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

type Coupon = { id: string; code: string; type: string; value: string; isActive: boolean; used: number; usageLimit: number | null };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  useEffect(() => {
    void api<Coupon[]>("/api/admin/coupons").then(setCoupons);
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const starts = new Date(String(data.get("startsAt"))).toISOString();
    const expiresRaw = String(data.get("expiresAt") || "");
    try {
      await api("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: data.get("code"),
          type: data.get("type"),
          value: data.get("value"),
          minOrderAmount: data.get("minOrderAmount") || "0",
          maxDiscountAmount: data.get("maxDiscountAmount") || "",
          usageLimit: data.get("usageLimit") || undefined,
          usageLimitPerUser: Number(data.get("usageLimitPerUser") || 1),
          startsAt: starts,
          expiresAt: expiresRaw ? new Date(expiresRaw).toISOString() : "",
          isActive: true,
        }),
      });
      toast.success("Coupon created");
      setCoupons(await api("/api/admin/coupons"));
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the coupon.");
    }
  }
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-medium">Coupons</h1>
      <ul className="grid gap-2 text-sm">
        {coupons.map((coupon) => (
          <li key={coupon.id} className="flex justify-between rounded-2xl border border-border p-4">
            <span>{coupon.code} · {coupon.type} {coupon.value} · used {coupon.used}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""} · {coupon.isActive ? "Active" : "Inactive"}</span>
            <button type="button" className="underline" onClick={async () => { await api(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" }); setCoupons(await api("/api/admin/coupons")); }}>Remove</button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
        <Field label="Code" htmlFor="code"><Input id="code" name="code" required /></Field>
        <Field label="Type" htmlFor="type">
          <select id="type" name="type" className="h-11 rounded-xl border border-input bg-card px-3"><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select>
        </Field>
        <Field label="Value" htmlFor="value"><Input id="value" name="value" required placeholder="10 or 200.00" /></Field>
        <Field label="Minimum order" htmlFor="minOrderAmount"><Input id="minOrderAmount" name="minOrderAmount" defaultValue="0" /></Field>
        <Field label="Maximum discount" htmlFor="maxDiscountAmount"><Input id="maxDiscountAmount" name="maxDiscountAmount" /></Field>
        <Field label="Usage limit" htmlFor="usageLimit"><Input id="usageLimit" name="usageLimit" /></Field>
        <Field label="Per customer" htmlFor="usageLimitPerUser"><Input id="usageLimitPerUser" name="usageLimitPerUser" defaultValue="1" /></Field>
        <Field label="Starts" htmlFor="startsAt"><Input id="startsAt" name="startsAt" type="datetime-local" required /></Field>
        <Field label="Expires" htmlFor="expiresAt"><Input id="expiresAt" name="expiresAt" type="datetime-local" /></Field>
        <Button type="submit">Create coupon</Button>
      </form>
    </div>
  );
}
