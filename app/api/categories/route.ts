import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { getFilterOptions, saveCategory } from "@/services/catalog";

export async function GET() {
  try {
    const filters = await getFilterOptions();
    return ok(filters.categories);
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    return ok(await saveCategory(await request.json()), 201);
  } catch (error) {
    return handle(error);
  }
}
