import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { adminListProducts } from "@/services/catalog";

export async function GET() {
  try {
    await requireAdmin();
    const products = await adminListProducts();
    return ok(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        price: product.price.toString(),
        brand: product.brand.name,
        category: product.category.name,
        image: product.images[0]?.url ?? null,
      })),
    );
  } catch (error) {
    return handle(error);
  }
}
