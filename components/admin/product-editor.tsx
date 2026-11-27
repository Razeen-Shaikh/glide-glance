"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/utils";

type Option = { id: string; name: string };

type EditorProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  gstRate: number;
  status: string;
  categoryId: string;
  brandId: string;
  images: { url: string }[];
  specifications: Record<string, string> | null;
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSpecialOffer: boolean;
  variants: {
    id: string;
    sku: string;
    name: string;
    price: string | null;
    attributes: { name: string; value: string }[];
    inventory: { quantityOnHand: number; lowStockThreshold: number } | null;
  }[];
};

export function ProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState<EditorProduct | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [categoryRows, brandRows] = await Promise.all([
        api<Option[]>("/api/categories"),
        api<Option[]>("/api/brands"),
      ]);
      if (cancelled) return;
      setCategories(categoryRows);
      setBrands(brandRows);
      if (!productId) {
        setReady(true);
        return;
      }
      try {
        const product = await api<EditorProduct>(`/api/admin/products/${productId}`);
        if (cancelled) return;
        setLoaded(product);
        setImageUrl(product.images[0]?.url ?? "");
      } catch {
        // The form stays blank so a failed load cannot overwrite the product.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    const uploaded = await api<{ url: string; publicId: string | null }>("/api/admin/uploads", { method: "POST", body });
    setImageUrl(uploaded.url);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "");
    const size = String(data.get("size") || "One size");
    const color = String(data.get("color") || "");
    const attributes = [{ name: "Size", value: size }];
    if (color) attributes.push({ name: "Color", value: color });
    const payload = {
      name,
      slug: String(data.get("slug") || slugify(name)),
      description: String(data.get("description") || ""),
      specifications: String(data.get("specs") || "")
        .split("\n")
        .map((line) => line.split(":"))
        .filter((parts) => parts.length === 2 && parts[0] && parts[1])
        .map(([specName, value]) => ({ name: specName.trim(), value: value.trim() })),
      price: String(data.get("price") || ""),
      compareAtPrice: String(data.get("compareAtPrice") || ""),
      gstRate: Number(data.get("gstRate")),
      status: String(data.get("status")),
      isFeatured: data.get("isFeatured") === "on",
      isTrending: data.get("isTrending") === "on",
      isBestSeller: data.get("isBestSeller") === "on",
      isNewArrival: data.get("isNewArrival") === "on",
      isSpecialOffer: data.get("isSpecialOffer") === "on",
      categoryId: String(data.get("categoryId")),
      brandId: String(data.get("brandId")),
      images: [{ url: imageUrl || String(data.get("imageUrl") || ""), alt: name }],
      variants: [
        {
          id: loaded?.variants[0]?.id,
          sku: String(data.get("sku") || ""),
          name: color ? `${color} / ${size}` : size,
          price: String(data.get("variantPrice") || ""),
          stock: Number(data.get("stock") || 0),
          lowStockThreshold: Number(data.get("threshold") || 5),
          attributes,
        },
        ...(loaded?.variants.slice(1) ?? []).map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          price: variant.price ?? "",
          stock: variant.inventory?.quantityOnHand ?? 0,
          lowStockThreshold: variant.inventory?.lowStockThreshold ?? 5,
          attributes: variant.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value })),
        })),
      ],
    };
    setPending(true);
    try {
      if (productId) await api(`/api/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Product saved");
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the product.");
    } finally {
      setPending(false);
    }
  }

  if (!ready) return <p className="text-sm text-muted-foreground">Loading product…</p>;
  if (productId && !loaded) return <p className="text-sm text-destructive">This product could not be loaded.</p>;

  const variant = loaded?.variants[0];
  const size = variant?.attributes.find((attribute) => attribute.name === "Size")?.value ?? "M";
  const color = variant?.attributes.find((attribute) => attribute.name === "Color")?.value ?? "";
  const specs = loaded?.specifications
    ? Object.entries(loaded.specifications).map(([name, value]) => `${name}: ${value}`).join("\n")
    : "";
  const flags: Record<string, boolean> = {
    isFeatured: loaded?.isFeatured ?? false,
    isTrending: loaded?.isTrending ?? false,
    isBestSeller: loaded?.isBestSeller ?? false,
    isNewArrival: loaded?.isNewArrival ?? false,
    isSpecialOffer: loaded?.isSpecialOffer ?? false,
  };

  return (
    <form key={loaded?.id ?? "new"} onSubmit={onSubmit} className="grid max-w-2xl gap-3">
      <Field label="Name" htmlFor="name"><Input id="name" name="name" required defaultValue={loaded?.name} /></Field>
      <Field label="Slug" htmlFor="slug"><Input id="slug" name="slug" placeholder="merino-crew" defaultValue={loaded?.slug} /></Field>
      <Field label="Description" htmlFor="description"><Textarea id="description" name="description" required defaultValue={loaded?.description} /></Field>
      <Field label="Specifications, one Name: Value per line" htmlFor="specs"><Textarea id="specs" name="specs" defaultValue={specs} /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Price" htmlFor="price"><Input id="price" name="price" required placeholder="2499.00" defaultValue={loaded?.price} /></Field>
        <Field label="Compare at" htmlFor="compareAtPrice"><Input id="compareAtPrice" name="compareAtPrice" defaultValue={loaded?.compareAtPrice ?? ""} /></Field>
        <Field label="GST %" htmlFor="gstRate">
          <select id="gstRate" name="gstRate" className="h-11 rounded-xl border border-input bg-card px-3" defaultValue={String(loaded?.gstRate ?? 18)}>
            {[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category" htmlFor="categoryId">
          <select id="categoryId" name="categoryId" className="h-11 rounded-xl border border-input bg-card px-3" required defaultValue={loaded?.categoryId}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field label="Brand" htmlFor="brandId">
          <select id="brandId" name="brandId" className="h-11 rounded-xl border border-input bg-card px-3" required defaultValue={loaded?.brandId}>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Status" htmlFor="status">
        <select id="status" name="status" className="h-11 rounded-xl border border-input bg-card px-3" defaultValue={loaded?.status ?? "PUBLISHED"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.keys(flags).map((flag) => (
          <label key={flag} className="flex items-center gap-2"><input type="checkbox" name={flag} defaultChecked={flags[flag]} /> {flag.replace("is", "")}</label>
        ))}
      </div>
      <Field label="Image URL" htmlFor="imageUrl"><Input id="imageUrl" name="imageUrl" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></Field>
      <label className="text-sm">
        Upload image
        <input type="file" accept="image/*" className="mt-1 block" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="SKU" htmlFor="sku"><Input id="sku" name="sku" required defaultValue={variant?.sku} /></Field>
        <Field label="Stock" htmlFor="stock"><Input id="stock" name="stock" type="number" required defaultValue={variant?.inventory?.quantityOnHand ?? 10} /></Field>
        <Field label="Size" htmlFor="size"><Input id="size" name="size" defaultValue={size} /></Field>
        <Field label="Color" htmlFor="color"><Input id="color" name="color" defaultValue={color} /></Field>
        <Field label="Variant price override" htmlFor="variantPrice"><Input id="variantPrice" name="variantPrice" defaultValue={variant?.price ?? ""} /></Field>
        <Field label="Low stock at" htmlFor="threshold"><Input id="threshold" name="threshold" type="number" defaultValue={variant?.inventory?.lowStockThreshold ?? 5} /></Field>
      </div>
      <Button type="submit" disabled={pending}>Save product</Button>
    </form>
  );
}
