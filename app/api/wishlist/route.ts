import { getActor } from "@/lib/actor";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { addWishlistItem, getWishlist } from "@/services/wishlist";
import { wishlistSchema } from "@/validations";

export async function GET() {
  try {
    return ok(await getWishlist(await getActor()));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const body = wishlistSchema.parse(await request.json());
    return ok(await addWishlistItem(actor, body.productId), 201);
  } catch (error) {
    return handle(error);
  }
}
