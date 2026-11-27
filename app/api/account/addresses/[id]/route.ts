import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { deleteAddress, updateAddress } from "@/services/account";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    return ok(await updateAddress(user.id, id, await request.json()));
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await deleteAddress(user.id, id);
    return ok({ deleted: true });
  } catch (error) {
    return handle(error);
  }
}
