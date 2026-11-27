import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { paiseToDecimalString, toPaise } from "@/lib/money";
import { quoteOrder } from "@/lib/pricing";
import { orderNumber } from "@/lib/utils";
import { formatInr } from "@/lib/money";
import { orderEmailHtml, sendEmail } from "@/lib/email";
import { getRazorpay, publicRazorpayKey, razorpayConfigured } from "@/lib/razorpay";
import { deductStock, lockInventories, reserveStock } from "@/services/inventory";
import { getCartView, type Actor } from "@/services/cart";
import type { CheckoutInput } from "@/validations";

function snapshot(address: CheckoutInput["shipping"]) {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: "IN" as const,
  };
}

export async function placeOrder(actor: Actor, input: CheckoutInput) {
  const preview = await getCartView(actor, input.deliveryOption);
  if (preview.cart.items.length === 0) throw new ApiError(400, "EMPTY_CART", "Your cart is empty.");
  if (preview.view.couponError && preview.cart.couponCode) {
    throw new ApiError(400, "COUPON", preview.view.couponError);
  }
  if (input.paymentMethod === "RAZORPAY" && !razorpayConfigured()) {
    throw new ApiError(503, "PAYMENTS_UNAVAILABLE", "Online payment is not configured. Choose cash on delivery.");
  }

  const billing = input.billingSame ? input.shipping : input.billing!;
  const shipping = snapshot(input.shipping);
  const billingSnapshot = snapshot(billing);

  const created = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { id: preview.cart.id },
      include: {
        items: {
          include: {
            variant: { include: { inventory: true, product: true, attributes: true } },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) throw new ApiError(400, "EMPTY_CART", "Your cart is empty.");
    await lockInventories(tx, cart.items.map((item) => item.variantId));

    const coupon = cart.couponCode
      ? await tx.coupon.findUnique({ where: { code: cart.couponCode } })
      : null;
    if (cart.couponCode && !coupon) throw new ApiError(400, "COUPON", "This coupon is no longer available.");
    if (coupon) {
      const now = new Date();
      if (!coupon.isActive || coupon.startsAt > now || (coupon.expiresAt && coupon.expiresAt < now)) {
        throw new ApiError(400, "COUPON", "This coupon is no longer available.");
      }
      if (coupon.usageLimit != null) {
        const used = await tx.couponUsage.count({ where: { couponId: coupon.id } });
        if (used >= coupon.usageLimit) throw new ApiError(400, "COUPON", "This coupon has reached its usage limit.");
      }
      const personal = actor.userId
        ? await tx.couponUsage.count({ where: { couponId: coupon.id, userId: actor.userId } })
        : actor.guestToken
          ? await tx.couponUsage.count({ where: { couponId: coupon.id, guestToken: actor.guestToken } })
          : 0;
      if (personal >= coupon.usageLimitPerUser) throw new ApiError(400, "COUPON", "This coupon has already been used.");
    }

    const lines = cart.items.map((item) => ({
      unitPricePaise: toPaise(item.variant.price ?? item.variant.product.price),
      quantity: item.quantity,
      gstRate: Number(item.variant.product.gstRate.toString()),
      item,
    }));
    for (const line of lines) {
      if (line.item.variant.product.status !== "PUBLISHED" || !line.item.variant.isActive) {
        throw new ApiError(409, "UNAVAILABLE", `${line.item.variant.product.name} is no longer available.`);
      }
    }
    const quote = quoteOrder(
      lines.map(({ unitPricePaise, quantity, gstRate }) => ({ unitPricePaise, quantity, gstRate })),
      coupon
        ? {
            type: coupon.type,
            value: coupon.value.toString(),
            minOrderAmount: coupon.minOrderAmount.toString(),
            maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? null,
          }
        : null,
      input.deliveryOption,
    );
    if (quote.couponMessage) throw new ApiError(400, "COUPON", quote.couponMessage);

    const number = orderNumber();
    const order = await tx.order.create({
      data: {
        orderNumber: number,
        userId: actor.userId,
        email: input.email.toLowerCase(),
        status: input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
        deliveryOption: input.deliveryOption,
        subtotal: paiseToDecimalString(quote.subtotalPaise),
        discountTotal: paiseToDecimalString(quote.discountPaise),
        shippingTotal: paiseToDecimalString(quote.shippingPaise),
        taxTotal: paiseToDecimalString(quote.taxPaise),
        grandTotal: paiseToDecimalString(quote.grandPaise),
        shippingAddress: shipping,
        billingAddress: billingSnapshot,
        notes: input.notes || null,
        items: {
          create: lines.map((line) => ({
            variantId: line.item.variantId,
            productId: line.item.variant.productId,
            productName: line.item.variant.product.name,
            sku: line.item.variant.sku,
            quantity: line.quantity,
            unitPrice: paiseToDecimalString(line.unitPricePaise),
            gstRate: line.gstRate,
          })),
        },
        payment: {
          create: {
            method: input.paymentMethod,
            status: "PENDING",
            amount: paiseToDecimalString(quote.grandPaise),
          },
        },
      },
      include: { items: true, payment: true },
    });

    for (const line of lines) {
      const inventoryId = line.item.variant.inventory?.id;
      if (!inventoryId) throw new ApiError(409, "STOCK", `${line.item.variant.product.name} is unavailable.`);
      const label = line.item.variant.product.name;
      if (input.paymentMethod === "COD") {
        await deductStock(tx, inventoryId, line.quantity, order.id, label, "Cash on delivery");
        await tx.product.update({
          where: { id: line.item.variant.productId },
          data: { salesCount: { increment: line.quantity } },
        });
      } else {
        await reserveStock(tx, inventoryId, line.quantity, order.id, label);
      }
    }

    if (coupon && quote.discountPaise > 0) {
      await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId: actor.userId,
          guestToken: actor.userId ? null : actor.guestToken,
          orderId: order.id,
          discount: paiseToDecimalString(quote.discountPaise),
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

    if (actor.userId && input.saveAddress) {
      if (input.shipping.isDefault) {
        await tx.address.updateMany({ where: { userId: actor.userId }, data: { isDefault: false } });
      }
      await tx.address.create({
        data: {
          userId: actor.userId,
          ...shipping,
          line2: shipping.line2,
          isDefault: Boolean(input.shipping.isDefault),
        },
      });
    }

    return order;
  });

  let razorpayOrderId: string | null = null;
  if (input.paymentMethod === "RAZORPAY") {
    try {
      const client = await getRazorpay();
      const remote = await client.orders.create({
        amount: toPaise(created.grandTotal),
        currency: "INR",
        receipt: created.orderNumber,
        notes: { orderId: created.id },
      });
      razorpayOrderId = remote.id;
      await prisma.payment.update({
        where: { orderId: created.id },
        data: { razorpayOrderId: remote.id },
      });
    } catch (error) {
      const { cancelUnpaidOrder } = await import("@/services/orders");
      await cancelUnpaidOrder(created.id, "Payment could not be started.");
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, "PAYMENT_PROVIDER", "Payment could not be started. Nothing was charged.");
    }
  } else {
    await sendEmail(
      created.email,
      `Order ${created.orderNumber} confirmed`,
      orderEmailHtml({
        title: "Your order is confirmed",
        intro: "We will pack this shortly. Pay the courier when it arrives.",
        orderNumber: created.orderNumber,
        total: formatInr(toPaise(created.grandTotal)),
        lines: created.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: formatInr(toPaise(item.unitPrice) * item.quantity),
        })),
      }),
    ).catch((error) => console.error(error));
  }

  return {
    orderId: created.id,
    orderNumber: created.orderNumber,
    grandTotal: created.grandTotal.toString(),
    paymentMethod: input.paymentMethod,
    razorpayOrderId,
    razorpayKeyId: input.paymentMethod === "RAZORPAY" ? publicRazorpayKey() : null,
    amountPaise: toPaise(created.grandTotal),
  };
}

export async function retryRazorpayOrder(orderId: string, actor: Actor, orderIds: string[] = []) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order || !order.payment) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  const owns = (actor.userId && order.userId === actor.userId) || orderIds.includes(order.id);
  if (!owns) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  if (order.status !== "PENDING" || order.payment.method !== "RAZORPAY") {
    throw new ApiError(409, "ORDER_STATE", "This order is not waiting for payment.");
  }
  if (order.payment.razorpayOrderId) {
    return {
      razorpayOrderId: order.payment.razorpayOrderId,
      razorpayKeyId: publicRazorpayKey(),
      amountPaise: toPaise(order.grandTotal),
      orderNumber: order.orderNumber,
    };
  }
  const client = await getRazorpay();
  const remote = await client.orders.create({
    amount: toPaise(order.grandTotal),
    currency: "INR",
    receipt: order.orderNumber,
    notes: { orderId: order.id },
  });
  await prisma.payment.update({ where: { orderId: order.id }, data: { razorpayOrderId: remote.id } });
  return {
    razorpayOrderId: remote.id,
    razorpayKeyId: publicRazorpayKey(),
    amountPaise: toPaise(order.grandTotal),
    orderNumber: order.orderNumber,
  };
}
