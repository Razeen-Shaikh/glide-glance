import { NextRequest } from "next/server";
import { clientIp, handle, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { trackOrder } from "@/services/orders";
import { trackOrderSchema } from "@/validations";

export async function GET(request: NextRequest) {
  try {
    rateLimit(`track:${clientIp(request)}`, 20, 10 * 60 * 1000);
    const parsed = trackOrderSchema.parse({
      orderNumber: request.nextUrl.searchParams.get("orderNumber"),
      email: request.nextUrl.searchParams.get("email"),
    });
    return ok(await trackOrder(parsed.orderNumber, parsed.email));
  } catch (error) {
    return handle(error);
  }
}
