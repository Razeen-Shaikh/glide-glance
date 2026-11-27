import { signOut } from "@/lib/auth";
import { assertSameOrigin, handle, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await signOut({ redirect: false });
    return ok({ loggedOut: true });
  } catch (error) {
    return handle(error);
  }
}
