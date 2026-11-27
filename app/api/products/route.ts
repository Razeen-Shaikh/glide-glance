import { NextRequest } from "next/server";
import { assertSameOrigin, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { createProduct, listProducts } from "@/services/catalog";

export async function GET(request: NextRequest) {
  try {
    return ok(await listProducts(request.nextUrl.searchParams));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const product = await createProduct(await request.json());
    return ok(product, 201);
  } catch (error) {
    return handle(error);
  }
}
