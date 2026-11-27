import { readGuestToken } from "@/lib/guest";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { mergeGuestBag } from "@/services/cart";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const guestToken = await readGuestToken();
    await mergeGuestBag(user.id, guestToken);
    return ok({ merged: true });
  } catch (error) {
    return handle(error);
  }
}
