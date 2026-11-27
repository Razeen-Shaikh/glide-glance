import { getActor } from "@/lib/actor";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { applyCoupon, clearCoupon } from "@/services/cart";
import { couponCodeSchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const body = couponCodeSchema.parse(await request.json());
    return ok(await applyCoupon(actor, body.code));
  } catch (error) {
    return handle(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    return ok(await clearCoupon(actor));
  } catch (error) {
    return handle(error);
  }
}
