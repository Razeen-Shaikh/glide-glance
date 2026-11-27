import { assertSameOrigin, handle, ok } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { createReview, listReviews } from "@/services/reviews";
import { prisma } from "@/lib/prisma";

async function productId(idOrSlug: string) {
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  });
  return product?.id ?? idOrSlug;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(await listReviews(await productId(id)));
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    rateLimit(`review:${user.id}`, 10, 60 * 60 * 1000);
    const { id } = await context.params;
    const review = await createReview(await productId(id), user.id, await request.json());
    return ok(
      { id: review.id, rating: review.rating, title: review.title, body: review.body },
      201,
    );
  } catch (error) {
    return handle(error);
  }
}
