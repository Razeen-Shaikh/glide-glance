import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { adminCustomers } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    return ok(await adminCustomers(request.nextUrl.searchParams));
  } catch (error) {
    return handle(error);
  }
}
