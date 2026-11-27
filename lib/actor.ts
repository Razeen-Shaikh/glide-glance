import "server-only";
import { ensureGuestToken, readGuestToken, readOrderAccess } from "@/lib/guest";
import { getCurrentUser } from "@/lib/session";

export async function getActor() {
  const user = await getCurrentUser();
  const guestToken = user ? await readGuestToken() : await ensureGuestToken();
  const orderIds = await readOrderAccess();
  return { user, userId: user?.id ?? null, guestToken, orderIds };
}
