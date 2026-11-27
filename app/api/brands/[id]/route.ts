import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { deleteBrand, saveBrand } from "@/services/catalog";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    return ok(await saveBrand(await request.json(), id));
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    await deleteBrand(id);
    return ok({ deleted: true });
  } catch (error) {
    return handle(error);
  }
}
