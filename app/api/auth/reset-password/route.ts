import { assertSameOrigin, handle, ok } from "@/lib/http";
import { resetPassword } from "@/services/identity";
import { resetPasswordSchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = resetPasswordSchema.parse(await request.json());
    await resetPassword(body);
    return ok({ reset: true });
  } catch (error) {
    return handle(error);
  }
}
