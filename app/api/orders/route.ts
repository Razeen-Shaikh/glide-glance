import { getActor } from "@/lib/actor";
import { rememberOrder } from "@/lib/guest";
import { assertSameOrigin, clientIp, handle, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { placeOrder } from "@/services/checkout";
import { listOrdersForUser } from "@/services/orders";
import { checkoutSchema } from "@/validations";

export async function GET() {
  try {
    const actor = await getActor();
    if (!actor.userId) return ok([]);
    return ok(await listOrdersForUser(actor.userId));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`checkout:${clientIp(request)}`, 8, 10 * 60 * 1000);
    const actor = await getActor();
    const body = checkoutSchema.parse(await request.json());
    const order = await placeOrder(actor, body);
    await rememberOrder(order.orderId);
    return ok(order, 201);
  } catch (error) {
    return handle(error);
  }
}
