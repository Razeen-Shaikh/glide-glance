import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { adminUpdateStatus } from "@/services/orders";
import { orderStatusSchema } from "@/validations";
import { prisma } from "@/lib/prisma";
import { presentOrder } from "@/services/orders";

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    await requireAdmin();
    const { orderNumber } = await context.params;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, payment: true, shipment: true, returnRequest: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!order) return ok(null);
    return ok(presentOrder(order));
  } catch (error) {
    return handle(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const { orderNumber } = await context.params;
    const body = orderStatusSchema.parse(await request.json());
    return ok(
      await adminUpdateStatus(orderNumber, body.status, {
        carrier: body.carrier,
        trackingNumber: body.trackingNumber,
        note: body.note,
      }),
    );
  } catch (error) {
    return handle(error);
  }
}
