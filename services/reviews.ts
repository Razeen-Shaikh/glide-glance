import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { reviewSchema } from "@/validations";

export async function listReviews(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const reviews = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
  return reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    verifiedPurchase: review.verifiedPurchase,
    author: review.user.name ?? "Customer",
    createdAt: review.createdAt.toISOString(),
  }));
}

export async function createReview(productId: string, userId: string, input: unknown) {
  const data = reviewSchema.parse(input);
  const product = await prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" } });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const delivered = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, status: "DELIVERED" } },
  });
  const review = await prisma.review.upsert({
    where: { productId_userId: { productId, userId } },
    create: {
      productId,
      userId,
      rating: data.rating,
      title: data.title || null,
      body: data.body,
      verifiedPurchase: Boolean(delivered),
    },
    update: {
      rating: data.rating,
      title: data.title || null,
      body: data.body,
      verifiedPurchase: Boolean(delivered),
    },
  });
  const aggregate = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAverage: aggregate._avg.rating ?? 0,
      ratingCount: aggregate._count,
    },
  });
  return review;
}
