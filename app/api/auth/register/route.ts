import { assertSameOrigin, clientIp, handle, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { registerUser } from "@/services/identity";
import { registerSchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    rateLimit(`register:${clientIp(request)}`, 5, 15 * 60 * 1000);
    const body = registerSchema.parse(await request.json());
    const user = await registerUser(body);
    return ok(user, 201);
  } catch (error) {
    return handle(error);
  }
}
