import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { adminGetProduct } from "@/services/catalog";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const product = await adminGetProduct(id);
    return ok({
      ...product,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      gstRate: Number(product.gstRate.toString()),
      variants: product.variants.map((variant) => ({
        ...variant,
        price: variant.price?.toString() ?? null,
      })),
    });
  } catch (error) {
    return handle(error);
  }
}
