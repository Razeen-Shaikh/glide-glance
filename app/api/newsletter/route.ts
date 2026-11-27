import { assertSameOrigin, clientIp, handle, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { subscribeNewsletter } from "@/services/account";
import { newsletterSchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`news:${clientIp(request)}`, 8, 60 * 60 * 1000);
    const body = newsletterSchema.parse(await request.json());
    return ok(await subscribeNewsletter(body.email));
  } catch (error) {
    return handle(error);
  }
}
