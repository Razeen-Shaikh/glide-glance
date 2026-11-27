import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { ApiError } from "@/lib/api-error";
import { archiveOrDeleteProduct, getProductBySlug, updateProduct } from "@/services/catalog";
import { prisma } from "@/lib/prisma";

async function resolveSlug(id: string) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { slug: true, id: true },
  });
  return product;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const product = await resolveSlug(id);
    if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
    return ok(await getProductBySlug(product.slug));
  } catch (error) {
    return handle(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    return ok(await updateProduct(id, await request.json()));
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    return ok(await archiveOrDeleteProduct(id));
  } catch (error) {
    return handle(error);
  }
}
