import { getActor } from "@/lib/actor";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { retryRazorpayOrder } from "@/services/checkout";
import { z } from "zod";

const schema = z.object({ orderId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const body = schema.parse(await request.json());
    return ok(await retryRazorpayOrder(body.orderId, actor, actor.orderIds));
  } catch (error) {
    return handle(error);
  }
}
