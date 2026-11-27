import { Suspense } from "react";
import { connection } from "next/server";
import { ProductEditor } from "@/components/admin/product-editor";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading product…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-medium">Edit product</h1>
      <ProductEditor productId={id} />
    </div>
  );
}
