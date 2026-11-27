import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { listInventory } from "@/services/admin";
import { adjustStock } from "@/services/inventory";
import { inventoryAdjustSchema } from "@/validations";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await listInventory());
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const body = inventoryAdjustSchema.parse(await request.json());
    return ok(await adjustStock(body.variantId, body.delta, body.note || "Manual adjustment"));
  } catch (error) {
    return handle(error);
  }
}
