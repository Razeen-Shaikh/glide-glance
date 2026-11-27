import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { listCoupons, saveCoupon } from "@/services/admin";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await listCoupons());
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    return ok(await saveCoupon(await request.json()), 201);
  } catch (error) {
    return handle(error);
  }
}
