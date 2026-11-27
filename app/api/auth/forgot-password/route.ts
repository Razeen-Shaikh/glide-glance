import { assertSameOrigin, clientIp, handle, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/services/identity";
import { forgotPasswordSchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`reset:${clientIp(request)}`, 5, 15 * 60 * 1000);
    const body = forgotPasswordSchema.parse(await request.json());
    await requestPasswordReset(body.email);
    return ok({ sent: true });
  } catch (error) {
    return handle(error);
  }
}
