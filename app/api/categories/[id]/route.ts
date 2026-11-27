import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { deleteCategory, saveCategory } from "@/services/catalog";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    return ok(await saveCategory(await request.json(), id));
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    await deleteCategory(id);
    return ok({ deleted: true });
  } catch (error) {
    return handle(error);
  }
}
