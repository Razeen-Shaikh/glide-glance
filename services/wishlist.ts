import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { serializeCard } from "@/lib/serialize";
import type { Actor } from "@/services/cart";
import { addCartItem } from "@/services/cart";

async function getOrCreateWishlist(actor: Actor) {
  if (!actor.userId && !actor.guestToken) {
    throw new ApiError(400, "CART_IDENTITY", "A shopper identity is required.");
  }
  const where = actor.userId ? { userId: actor.userId } : { guestToken: actor.guestToken! };
  const existing = await prisma.wishlist.findUnique({ where });
  if (existing) return existing;
  return prisma.wishlist.create({ data: where });
}

const include = {
  items: {
    orderBy: { createdAt: "desc" as const },
    include: {
      product: {
        include: {
          brand: { select: { name: true, slug: true } },
          category: { select: { name: true, slug: true } },
          images: { orderBy: { position: "asc" as const }, take: 1 },
          variants: { where: { isActive: true }, select: { id: true, inventory: { select: { quantityAvailable: true } } } },
        },
      },
    },
  },
};

export async function getWishlist(actor: Actor) {
  const wishlist = await getOrCreateWishlist(actor);
  const full = await prisma.wishlist.findUnique({ where: { id: wishlist.id }, include });
  return (full?.items ?? [])
    .filter((item) => item.product.status === "PUBLISHED")
    .map((item) => ({
      id: item.id,
      product: serializeCard(item.product),
      variantId: item.product.variants.find((variant) => (variant.inventory?.quantityAvailable ?? 0) > 0)?.id
        ?? item.product.variants[0]?.id
        ?? null,
    }));
}

export async function addWishlistItem(actor: Actor, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, status: "PUBLISHED" } });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const wishlist = await getOrCreateWishlist(actor);
  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
  return getWishlist(actor);
}

export async function removeWishlistItem(actor: Actor, itemId: string) {
  const wishlist = await getOrCreateWishlist(actor);
  const item = await prisma.wishlistItem.findFirst({ where: { id: itemId, wishlistId: wishlist.id } });
  if (!item) throw new ApiError(404, "NOT_FOUND", "Wishlist item not found.");
  await prisma.wishlistItem.delete({ where: { id: item.id } });
  return getWishlist(actor);
}

export async function moveWishlistItemToCart(actor: Actor, itemId: string) {
  const wishlist = await getOrCreateWishlist(actor);
  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, wishlistId: wishlist.id },
    include: { product: { include: { variants: { include: { inventory: true } } } } },
  });
  if (!item) throw new ApiError(404, "NOT_FOUND", "Wishlist item not found.");
  const variant = item.product.variants.find((entry) => entry.isActive && (entry.inventory?.quantityAvailable ?? 0) > 0);
  if (!variant) throw new ApiError(409, "STOCK", "This piece is out of stock.");
  await addCartItem(actor, variant.id, 1);
  await prisma.wishlistItem.delete({ where: { id: item.id } });
  return getWishlist(actor);
}
