import { getActor } from "@/lib/actor";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { removeCartItem, updateCartItem } from "@/services/cart";
import { cartQuantitySchema } from "@/validations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const { id } = await context.params;
    const body = cartQuantitySchema.parse(await request.json());
    return ok(await updateCartItem(actor, id, body.quantity));
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const { id } = await context.params;
    return ok(await removeCartItem(actor, id));
  } catch (error) {
    return handle(error);
  }
}
