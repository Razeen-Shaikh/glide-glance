"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/utils";

type Named = { id: string; name: string; slug: string };

export default function CatalogAdminPage() {
  const [categories, setCategories] = useState<Named[]>([]);
  const [brands, setBrands] = useState<Named[]>([]);
  async function load() {
    setCategories(await api("/api/categories"));
    setBrands(await api("/api/brands"));
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: FormEvent<HTMLFormElement>, kind: "categories" | "brands") {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "");
    try {
      await api(`/api/${kind}`, { method: "POST", body: JSON.stringify({ name, slug: slugify(name), description: data.get("description") || "" }) });
      toast.success("Saved");
      event.currentTarget.reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    }
  }
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section className="grid gap-3">
        <h1 className="text-3xl font-medium">Categories</h1>
        <ul className="text-sm">{categories.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
        <form onSubmit={(event) => create(event, "categories")} className="grid gap-3">
          <Field label="Name" htmlFor="category-name"><Input id="category-name" name="name" required /></Field>
          <Field label="Description" htmlFor="category-description"><Input id="category-description" name="description" /></Field>
          <Button type="submit">Add category</Button>
        </form>
      </section>
      <section className="grid gap-3">
        <h2 className="text-3xl font-medium">Brands</h2>
        <ul className="text-sm">{brands.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
        <form onSubmit={(event) => create(event, "brands")} className="grid gap-3">
          <Field label="Name" htmlFor="brand-name"><Input id="brand-name" name="name" required /></Field>
          <Button type="submit">Add brand</Button>
        </form>
      </section>
    </div>
  );
}
