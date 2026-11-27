import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { getDashboard } from "@/services/admin";

export async function GET() {
  try {
    await requireAdmin();
    const dashboard = await getDashboard();
    return ok({
      revenueByDay: dashboard.revenueByDay,
      customerGrowth: dashboard.customerGrowth,
      statusCounts: dashboard.statusCounts,
      bestSellers: dashboard.bestSellers,
    });
  } catch (error) {
    return handle(error);
  }
}
