"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

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

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  async function load() {
    setAddresses(await api<Address[]>("/api/account/addresses"));
  }
  useEffect(() => {
    void load();
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/account/addresses", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.get("fullName"),
          phone: data.get("phone"),
          line1: data.get("line1"),
          city: data.get("city"),
          state: data.get("state"),
          postalCode: data.get("postalCode"),
          country: "IN",
          isDefault: data.get("isDefault") === "on",
        }),
      });
      event.currentTarget.reset();
      toast.success("Address saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the address.");
    }
  }
  async function remove(id: string) {
    await api(`/api/account/addresses/${id}`, { method: "DELETE" });
    await load();
  }
  if (!addresses) return <div className="h-40 animate-pulse rounded-3xl bg-muted" />;
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-medium">Addresses</h1>
      <div className="grid gap-3">
        {addresses.length === 0 ? <p className="text-muted-foreground">No saved addresses.</p> : null}
        {addresses.map((address) => (
          <article key={address.id} className="flex items-start justify-between rounded-2xl border border-border p-4">
            <p className="text-sm">
              {address.fullName}
              {address.isDefault ? " · Default" : ""}
              <br />
              {address.line1}, {address.city}, {address.state} {address.postalCode}
              <br />
              {address.phone}
            </p>
            <button type="button" className="text-sm underline" onClick={() => remove(address.id)}>
              Remove
            </button>
          </article>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
        <Field label="Full name" htmlFor="fullName"><Input id="fullName" name="fullName" required /></Field>
        <Field label="Mobile" htmlFor="phone"><Input id="phone" name="phone" required /></Field>
        <Field label="Address" htmlFor="line1"><Input id="line1" name="line1" required /></Field>
        <Field label="City" htmlFor="city"><Input id="city" name="city" required /></Field>
        <Field label="State" htmlFor="state"><Input id="state" name="state" required /></Field>
        <Field label="PIN code" htmlFor="postalCode"><Input id="postalCode" name="postalCode" required /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" /> Default address</label>
        <Button type="submit">Save address</Button>
      </form>
    </div>
  );
}
