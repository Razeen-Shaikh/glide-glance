import { getActor } from "@/lib/actor";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { removeWishlistItem } from "@/services/wishlist";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    return ok(await removeWishlistItem(await getActor(), id));
  } catch (error) {
    return handle(error);
  }
}
