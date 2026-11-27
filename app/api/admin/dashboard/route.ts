import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { getDashboard } from "@/services/admin";

export async function GET() {
  try {
    await requireAdmin();
    return ok(await getDashboard());
  } catch (error) {
    return handle(error);
  }
}
