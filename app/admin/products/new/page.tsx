import { ProductEditor } from "@/components/admin/product-editor";

export default function NewProductPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-medium">New product</h1>
      <ProductEditor />
    </div>
  );
}
