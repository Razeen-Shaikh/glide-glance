import { getActor } from "@/lib/actor";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { addCartItem } from "@/services/cart";
import { cartItemSchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const body = cartItemSchema.parse(await request.json());
    return ok(await addCartItem(actor, body.variantId, body.quantity), 201);
  } catch (error) {
    return handle(error);
  }
}
