import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { decideReturn } from "@/services/orders";
import { returnDecisionSchema } from "@/validations";

export async function POST(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { orderNumber } = await context.params;
    const body = returnDecisionSchema.parse(await request.json());
    return ok(await decideReturn(orderNumber, body.decision, body.note));
  } catch (error) {
    return handle(error);
  }
}
