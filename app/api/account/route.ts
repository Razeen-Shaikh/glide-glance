import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { updateProfile } from "@/services/account";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(user);
  } catch (error) {
    return handle(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return ok(await updateProfile(user.id, await request.json()));
  } catch (error) {
    return handle(error);
  }
}
