import { getActor } from "@/lib/actor";
import { handle, ok } from "@/lib/http";
import { getCartView } from "@/services/cart";

export async function GET(request: Request) {
  try {
    const actor = await getActor();
    const delivery = new URL(request.url).searchParams.get("delivery") === "EXPRESS" ? "EXPRESS" : "STANDARD";
    const cart = await getCartView(actor, delivery);
    return ok(cart.view);
  } catch (error) {
    return handle(error);
  }
}
