import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { adminCustomer, setCustomerActive } from "@/services/admin";
import { customerStatusSchema } from "@/validations";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    return ok(await adminCustomer(id));
  } catch (error) {
    return handle(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { id } = await context.params;
    const body = customerStatusSchema.parse(await request.json());
    return ok(await setCustomerActive(id, body.isActive));
  } catch (error) {
    return handle(error);
  }
}
