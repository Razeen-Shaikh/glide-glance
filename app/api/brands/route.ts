import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { getFilterOptions, saveBrand } from "@/services/catalog";

export async function GET() {
  try {
    return ok((await getFilterOptions()).brands);
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    return ok(await saveBrand(await request.json()), 201);
  } catch (error) {
    return handle(error);
  }
}
