import { ApiError } from "@/lib/api-error";
import { handle, ok } from "@/lib/http";
import { releaseExpiredReservations } from "@/services/orders";

export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const header = request.headers.get("authorization");
    if (!secret || header !== `Bearer ${secret}`) {
      throw new ApiError(401, "UNAUTHENTICATED", "Unauthorized.");
    }
    return ok(await releaseExpiredReservations());
  } catch (error) {
    return handle(error);
  }
}
