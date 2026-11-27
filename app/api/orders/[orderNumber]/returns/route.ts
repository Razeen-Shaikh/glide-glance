import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { requestReturn } from "@/services/orders";
import { returnSchema } from "@/validations";

export async function POST(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { orderNumber } = await context.params;
    const body = returnSchema.parse(await request.json());
    return ok(await requestReturn(orderNumber, user.id, body.reason), 201);
  } catch (error) {
    return handle(error);
  }
}
