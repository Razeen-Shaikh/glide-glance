"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

type Product = { id: string; name: string; status: string; price: string; brand: string; category: string };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    void api<Product[]>("/api/admin/products").then(setProducts);
  }, []);
  async function remove(id: string) {
    await api(`/api/products/${id}`, { method: "DELETE" });
    toast.success("Product removed from the storefront");
    setProducts(await api<Product[]>("/api/admin/products"));
  }
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium">Products</h1>
        <Button asChild><Link href="/admin/products/new">New product</Link></Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-border"><th className="py-2">Name</th><th>Status</th><th>Price</th><th></th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border">
                <td className="py-3">{product.name}<span className="block text-muted-foreground">{product.brand} · {product.category}</span></td>
                <td>{product.status}</td>
                <td>{product.price}</td>
                <td className="text-right">
                  <Link href={`/admin/products/${product.id}`} className="mr-3 underline">Edit</Link>
                  <button type="button" className="underline" onClick={() => remove(product.id)}>Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
