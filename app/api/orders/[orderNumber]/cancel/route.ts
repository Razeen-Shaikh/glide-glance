import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { cancelOrder } from "@/services/orders";
import { cancelOrderSchema } from "@/validations";

export async function PATCH(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { orderNumber } = await context.params;
    const body = cancelOrderSchema.parse(await request.json());
    return ok(await cancelOrder(orderNumber, user.id, body.reason));
  } catch (error) {
    return handle(error);
  }
}
