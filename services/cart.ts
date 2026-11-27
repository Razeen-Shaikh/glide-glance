import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { MAX_LINE_QUANTITY } from "@/lib/constants";
import { paiseToDecimalString, toPaise } from "@/lib/money";
import { quoteOrder, type CouponQuoteInput, type DeliveryOption, type PricedLine } from "@/lib/pricing";

export type Actor = { userId: string | null; guestToken: string | null };

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          attributes: true,
          inventory: true,
          product: {
            include: {
              images: { orderBy: { position: "asc" as const }, take: 1 },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function assertActor(actor: Actor) {
  if (!actor.userId && !actor.guestToken) {
    throw new ApiError(400, "CART_IDENTITY", "A shopper identity is required.");
  }
}

export async function getOrCreateCart(actor: Actor) {
  assertActor(actor);
  const where = actor.userId ? { userId: actor.userId } : { guestToken: actor.guestToken! };
  const existing = await prisma.cart.findUnique({ where, include: cartInclude });
  if (existing) return existing;
  return prisma.cart.create({ data: where, include: cartInclude });
}

async function loadCoupon(code: string | null, actor: Actor) {
  if (!code) return { coupon: null, input: null as CouponQuoteInput | null, error: null as string | null };
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const now = new Date();
  if (!coupon || !coupon.isActive || coupon.startsAt > now || (coupon.expiresAt && coupon.expiresAt < now)) {
    return { coupon: null, input: null, error: "This coupon is not active." };
  }
  if (coupon.usageLimit != null) {
    const used = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
    if (used >= coupon.usageLimit) return { coupon: null, input: null, error: "This coupon has reached its usage limit." };
  }
  const ownerWhere = actor.userId ? { userId: actor.userId } : { guestToken: actor.guestToken ?? undefined };
  if (ownerWhere.userId || ownerWhere.guestToken) {
    const usedBy = await prisma.couponUsage.count({ where: { couponId: coupon.id, ...ownerWhere } });
    if (usedBy >= coupon.usageLimitPerUser) {
      return { coupon: null, input: null, error: "This coupon has already been used." };
    }
  }
  return {
    coupon,
    input: {
      type: coupon.type,
      value: coupon.value.toString(),
      minOrderAmount: coupon.minOrderAmount.toString(),
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? null,
    } satisfies CouponQuoteInput,
    error: null,
  };
}

export function presentCart(cart: CartRecord, quote: ReturnType<typeof quoteOrder>, couponError: string | null, delivery: DeliveryOption) {
  return {
    id: cart.id,
    couponCode: cart.couponCode,
    couponError,
    deliveryOption: delivery,
    items: cart.items.map((item) => {
      const unit = item.variant.price ?? item.variant.product.price;
      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice: unit.toString(),
        lineTotal: paiseToDecimalString(toPaise(unit) * item.quantity),
        available: item.variant.inventory?.quantityAvailable ?? 0,
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          name: item.variant.name,
          attributes: item.variant.attributes.map((attribute) => ({
            name: attribute.name,
            value: attribute.value,
          })),
        },
        product: {
          id: item.variant.product.id,
          name: item.variant.product.name,
          slug: item.variant.product.slug,
          image: item.variant.product.images[0]?.url ?? null,
        },
      };
    }),
    quote: {
      subtotal: (quote.subtotalPaise / 100).toFixed(2),
      discount: (quote.discountPaise / 100).toFixed(2),
      shipping: (quote.shippingPaise / 100).toFixed(2),
      tax: (quote.taxPaise / 100).toFixed(2),
      grand: (quote.grandPaise / 100).toFixed(2),
      couponMessage: quote.couponMessage,
    },
  };
}

function linesFromCart(cart: CartRecord): PricedLine[] {
  return cart.items.map((item) => ({
    unitPricePaise: toPaise(item.variant.price ?? item.variant.product.price),
    quantity: item.quantity,
    gstRate: Number(item.variant.product.gstRate.toString()),
  }));
}

export async function getCartView(actor: Actor, delivery: DeliveryOption = "STANDARD") {
  const cart = await getOrCreateCart(actor);
  const loaded = await loadCoupon(cart.couponCode, actor);
  const quote = quoteOrder(linesFromCart(cart), loaded.input, delivery);
  return {
    cart,
    view: presentCart(cart, quote, loaded.error, delivery),
    coupon: loaded.coupon,
    quote,
  };
}

async function assertPurchasable(variantId: string, quantity: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: true },
  });
  if (!variant || !variant.isActive || variant.product.status !== "PUBLISHED") {
    throw new ApiError(404, "NOT_FOUND", "That product is unavailable.");
  }
  const available = variant.inventory?.quantityAvailable ?? 0;
  if (quantity < 1 || quantity > MAX_LINE_QUANTITY || quantity > available) {
    throw new ApiError(409, "STOCK", `Only ${Math.min(available, MAX_LINE_QUANTITY)} available.`);
  }
  return variant;
}

export async function addCartItem(actor: Actor, variantId: string, quantity: number) {
  const variant = await assertPurchasable(variantId, 1);
  const cart = await getOrCreateCart(actor);
  const existing = cart.items.find((item) => item.variantId === variantId);
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  const available = variant.inventory?.quantityAvailable ?? 0;
  if (nextQuantity > available || nextQuantity > MAX_LINE_QUANTITY) {
    throw new ApiError(409, "STOCK", `Only ${Math.min(available, MAX_LINE_QUANTITY)} available.`);
  }
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  }
  return (await getCartView(actor)).view;
}

export async function updateCartItem(actor: Actor, itemId: string, quantity: number) {
  const cart = await getOrCreateCart(actor);
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) throw new ApiError(404, "NOT_FOUND", "That cart item was not found.");
  await assertPurchasable(item.variantId, quantity);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  return (await getCartView(actor)).view;
}

export async function removeCartItem(actor: Actor, itemId: string) {
  const cart = await getOrCreateCart(actor);
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) throw new ApiError(404, "NOT_FOUND", "That cart item was not found.");
  await prisma.cartItem.delete({ where: { id: item.id } });
  return (await getCartView(actor)).view;
}

export async function applyCoupon(actor: Actor, code: string) {
  const cart = await getOrCreateCart(actor);
  const loaded = await loadCoupon(code, actor);
  if (!loaded.coupon) throw new ApiError(400, "COUPON", loaded.error ?? "This coupon cannot be applied.");
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: loaded.coupon.code } });
  return (await getCartView(actor)).view;
}

export async function clearCoupon(actor: Actor) {
  const cart = await getOrCreateCart(actor);
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  return (await getCartView(actor)).view;
}

export async function mergeGuestBag(userId: string, guestToken: string | null) {
  if (!guestToken) return;
  const guestCart = await prisma.cart.findUnique({ where: { guestToken }, include: { items: true } });
  if (guestCart) {
    const userCart = await prisma.cart.upsert({
      where: { userId },
      create: { userId, couponCode: guestCart.couponCode },
      update: {},
    });
    for (const item of guestCart.items) {
      await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        create: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      });
    }
    const items = await prisma.cartItem.findMany({
      where: { cartId: userCart.id },
      include: { variant: { include: { inventory: true } } },
    });
    for (const item of items) {
      const available = item.variant.inventory?.quantityAvailable ?? 0;
      const quantity = Math.min(item.quantity, available, MAX_LINE_QUANTITY);
      if (quantity < 1) await prisma.cartItem.delete({ where: { id: item.id } });
      else if (quantity !== item.quantity) await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    }
    if (guestCart.id !== userCart.id) await prisma.cart.delete({ where: { id: guestCart.id } });
  }

  const guestWishlist = await prisma.wishlist.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestWishlist) return;
  const userWishlist = await prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  for (const item of guestWishlist.items) {
    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: userWishlist.id, productId: item.productId } },
      create: { wishlistId: userWishlist.id, productId: item.productId },
      update: {},
    });
  }
  if (guestWishlist.id !== userWishlist.id) await prisma.wishlist.delete({ where: { id: guestWishlist.id } });
}
