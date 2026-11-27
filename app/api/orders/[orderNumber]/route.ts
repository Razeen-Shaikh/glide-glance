import { getActor } from "@/lib/actor";
import { handle, ok } from "@/lib/http";
import { getOrderForActor } from "@/services/orders";

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    const actor = await getActor();
    const { orderNumber } = await context.params;
    return ok(await getOrderForActor(orderNumber, actor.userId, actor.orderIds));
  } catch (error) {
    return handle(error);
  }
}
