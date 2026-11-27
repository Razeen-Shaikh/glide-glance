import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { storeImage } from "@/lib/media";
import { ApiError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "UPLOAD", "Choose an image to upload.");
    return ok(await storeImage(file), 201);
  } catch (error) {
    return handle(error);
  }
}
