import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { createAddress, listAddresses } from "@/services/account";

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listAddresses(user.id));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return ok(await createAddress(user.id, await request.json()), 201);
  } catch (error) {
    return handle(error);
  }
}
