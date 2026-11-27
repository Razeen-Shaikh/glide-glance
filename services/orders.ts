import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { formatInr, toPaise } from "@/lib/money";
import { canTransition, customerCanCancel, returnWindowOpen, type OrderStatus } from "@/lib/order-state";
import { orderEmailHtml, sendEmail } from "@/lib/email";
import { getRazorpay } from "@/lib/razorpay";
import { captureReserved, releaseReserved, restock } from "@/services/inventory";
import { verifyPaymentSignature } from "@/lib/signatures";

const orderInclude = {
  items: true,
  payment: true,
  shipment: true,
  returnRequest: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} as const;

export async function getOrderForActor(orderNumber: string, userId: string | null, guestOrderIds: string[]) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  const allowed = (userId && order.userId === userId) || guestOrderIds.includes(order.id);
  if (!allowed) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  return presentOrder(order);
}

export async function trackOrder(orderNumber: string, email: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
    throw new ApiError(404, "NOT_FOUND", "No order matches those details.");
  }
  return presentOrder(order);
}

export async function listOrdersForUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });
  return orders.map(presentOrder);
}

export function presentOrder(order: {
  id: string;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  deliveryOption: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  shippingTotal: { toString(): string };
  taxTotal: { toString(): string };
  grandTotal: { toString(): string };
  shippingAddress: unknown;
  billingAddress: unknown;
  notes: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: { toString(): string };
    productId: string | null;
  }[];
  payment: {
    method: string;
    status: string;
    amount: { toString(): string };
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    refundId: string | null;
  } | null;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  } | null;
  returnRequest: { reason: string; status: string; createdAt: Date } | null;
  user?: { id: string; name: string | null; email: string; phone: string | null } | null;
}) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email,
    status: order.status,
    deliveryOption: order.deliveryOption,
    subtotal: order.subtotal.toString(),
    discountTotal: order.discountTotal.toString(),
    shippingTotal: order.shippingTotal.toString(),
    taxTotal: order.taxTotal.toString(),
    grandTotal: order.grandTotal.toString(),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    notes: order.notes,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      productId: item.productId,
    })),
    payment: order.payment
      ? {
          method: order.payment.method,
          status: order.payment.status,
          amount: order.payment.amount.toString(),
          razorpayOrderId: order.payment.razorpayOrderId,
          razorpayPaymentId: order.payment.razorpayPaymentId,
          refundId: order.payment.refundId,
        }
      : null,
    shipment: order.shipment
      ? {
          carrier: order.shipment.carrier,
          trackingNumber: order.shipment.trackingNumber,
          shippedAt: order.shipment.shippedAt?.toISOString() ?? null,
          deliveredAt: order.shipment.deliveredAt?.toISOString() ?? null,
        }
      : null,
    returnRequest: order.returnRequest
      ? {
          reason: order.returnRequest.reason,
          status: order.returnRequest.status,
          createdAt: order.returnRequest.createdAt.toISOString(),
        }
      : null,
    customer: order.user ? { name: order.user.name, email: order.user.email, phone: order.user.phone } : null,
  };
}

async function loadOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order?.payment) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  return order;
}

export async function cancelUnpaidOrder(orderId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
    if (!order?.payment || order.status !== "PENDING") return;
    for (const item of order.items) {
      if (!item.variantId) continue;
      const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
      if (inventory) await releaseReserved(tx, inventory.id, item.quantity, order.id);
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelReason: reason } });
    await tx.payment.update({ where: { orderId: order.id }, data: { status: "FAILED" } });
    if (order.payment) {
      await tx.couponUsage.deleteMany({ where: { orderId: order.id } });
    }
  });
}

export async function cancelOrder(orderNumber: string, userId: string, reason: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order || order.userId !== userId) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  if (!customerCanCancel(order.status)) {
    throw new ApiError(409, "ORDER_STATE", "This order can no longer be cancelled.");
  }
  await applyCancellation(order.id, reason);
  return getOrderForActor(orderNumber, userId, []);
}

async function applyCancellation(orderId: string, reason: string) {
  const order = await loadOrder(orderId);
  if (order.payment?.method === "RAZORPAY" && order.payment.status === "PENDING") {
    await cancelUnpaidOrder(orderId, reason);
    return;
  }
  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
    if (!current?.payment) throw new ApiError(404, "NOT_FOUND", "Order not found.");
    if (!customerCanCancel(current.status) && current.status !== "PROCESSING" && current.status !== "CONFIRMED" && current.status !== "PENDING") {
      throw new ApiError(409, "ORDER_STATE", "This order can no longer be cancelled.");
    }
    for (const item of current.items) {
      if (!item.variantId || !item.productId) continue;
      const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
      if (!inventory) continue;
      if (current.payment.method === "RAZORPAY" && current.payment.status === "PENDING") {
        await releaseReserved(tx, inventory.id, item.quantity, current.id);
      } else {
        await restock(tx, inventory.id, item.quantity, current.id, "RELEASE", "Order cancelled");
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { decrement: item.quantity } },
        });
      }
    }
    await tx.order.update({ where: { id: current.id }, data: { status: "CANCELLED", cancelReason: reason } });
    await tx.payment.update({
      where: { orderId: current.id },
      data: { status: current.payment.status === "CAPTURED" ? "CAPTURED" : "FAILED" },
    });
  });
  if (order.payment?.status === "CAPTURED" && order.payment.razorpayPaymentId) {
    await refundPayment(order.payment.razorpayPaymentId, toPaise(order.payment.amount), order.id);
  }
  await sendEmail(
    order.email,
    `Order ${order.orderNumber} cancelled`,
    `<p>Your order ${order.orderNumber} has been cancelled.</p><p>${reason}</p>`,
  ).catch((error) => console.error(error));
}

async function refundPayment(paymentId: string, amountPaise: number, orderId: string) {
  try {
    const client = await getRazorpay();
    const refund = await client.payments.refund(paymentId, { amount: amountPaise });
    await prisma.payment.update({ where: { orderId }, data: { refundId: refund.id, status: "REFUNDED" } });
  } catch (error) {
    console.error(error);
    throw new ApiError(502, "REFUND_FAILED", "The order was cancelled, but the refund needs a retry from the dashboard.");
  }
}

export async function requestReturn(orderNumber: string, userId: string, reason: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { returnRequest: true, shipment: true },
  });
  if (!order || order.userId !== userId) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  if (order.status !== "DELIVERED") throw new ApiError(409, "ORDER_STATE", "Only delivered orders can be returned.");
  if (order.returnRequest) throw new ApiError(409, "RETURN_EXISTS", "A return has already been requested.");
  const deliveredAt = order.shipment?.deliveredAt ?? order.updatedAt;
  if (!returnWindowOpen(deliveredAt)) {
    throw new ApiError(409, "RETURN_WINDOW", "The 7-day return window has closed.");
  }
  await prisma.$transaction([
    prisma.returnRequest.create({ data: { orderId: order.id, reason, status: "REQUESTED" } }),
    prisma.order.update({ where: { id: order.id }, data: { status: "RETURN_REQUESTED" } }),
  ]);
  return getOrderForActor(orderNumber, userId, []);
}

export async function adminUpdateStatus(
  orderNumber: string,
  status: OrderStatus,
  meta: { carrier?: string; trackingNumber?: string; note?: string },
) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order) throw new ApiError(404, "NOT_FOUND", "Order not found.");
  if (status === "CANCELLED") {
    await applyCancellation(order.id, meta.note || "Cancelled by the store.");
    return presentOrder((await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude }))!);
  }
  if (status === "RETURNED" || status === "RETURN_REQUESTED") {
    throw new ApiError(409, "ORDER_STATE", "Use the return actions for this change.");
  }
  if (!canTransition(order.status, status)) {
    throw new ApiError(409, "ORDER_STATE", `Cannot move an order from ${order.status} to ${status}.`);
  }
  if (status === "SHIPPED" && !meta.trackingNumber) {
    throw new ApiError(422, "VALIDATION_ERROR", "Add a tracking number before marking the order shipped.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status } });
    if (status === "SHIPPED") {
      await tx.shipment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          carrier: meta.carrier || "Courier",
          trackingNumber: meta.trackingNumber,
          shippedAt: new Date(),
        },
        update: {
          carrier: meta.carrier || "Courier",
          trackingNumber: meta.trackingNumber,
          shippedAt: new Date(),
        },
      });
    }
    if (status === "DELIVERED") {
      await tx.shipment.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, deliveredAt: new Date() },
        update: { deliveredAt: new Date() },
      });
      if (order.payment?.method === "COD") {
        await tx.payment.update({ where: { orderId: order.id }, data: { status: "CAPTURED" } });
      }
    }
  });
  if (status === "SHIPPED") {
    await sendEmail(
      order.email,
      `Order ${order.orderNumber} has shipped`,
      `<p>Your order is on the way.</p><p>Tracking: ${meta.trackingNumber}</p>`,
    ).catch((error) => console.error(error));
  }
  const fresh = await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude });
  return presentOrder(fresh!);
}

export async function decideReturn(orderNumber: string, decision: "approve" | "reject", note?: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  if (!order?.returnRequest) throw new ApiError(404, "NOT_FOUND", "Return request not found.");
  if (order.status !== "RETURN_REQUESTED") throw new ApiError(409, "ORDER_STATE", "This return is already resolved.");
  if (decision === "reject") {
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } }),
      prisma.returnRequest.update({
        where: { orderId: order.id },
        data: { status: "REJECTED", reason: note ? `${order.returnRequest.reason}\n\nStore note: ${note}` : order.returnRequest.reason },
      }),
    ]);
  } else {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.variantId || !item.productId) continue;
        const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
        if (inventory) await restock(tx, inventory.id, item.quantity, order.id, "RETURN", "Return accepted");
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { decrement: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "RETURNED" } });
      await tx.returnRequest.update({ where: { orderId: order.id }, data: { status: "COMPLETED" } });
      if (order.payment?.status === "CAPTURED" && order.payment.method !== "RAZORPAY") {
        await tx.payment.update({ where: { orderId: order.id }, data: { status: "REFUNDED" } });
      }
    });
    if (order.payment?.method === "RAZORPAY" && order.payment.razorpayPaymentId && order.payment.status === "CAPTURED") {
      await refundPayment(order.payment.razorpayPaymentId, toPaise(order.payment.amount), order.id);
    }
    await sendEmail(
      order.email,
      `Return approved for ${order.orderNumber}`,
      `<p>Your return was accepted. Refunds for prepaid orders are issued to the original payment method.</p>`,
    ).catch((error) => console.error(error));
  }
  const fresh = await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude });
  return presentOrder(fresh!);
}

export async function captureVerifiedPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature?: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new ApiError(503, "PAYMENTS_UNAVAILABLE", "Online payment is not configured.");
  if (input.signature && !verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.signature, secret)) {
    throw new ApiError(400, "INVALID_SIGNATURE", "Payment verification failed.");
  }
  const client = await getRazorpay();
  const remote = await client.payments.fetch(input.razorpayPaymentId);
  if (remote.order_id !== input.razorpayOrderId) {
    throw new ApiError(400, "PAYMENT_MISMATCH", "Payment does not match this order.");
  }
  if (remote.status === "authorized") {
    await client.payments.capture(input.razorpayPaymentId, remote.amount, remote.currency);
  } else if (remote.status !== "captured") {
    throw new ApiError(400, "PAYMENT_INCOMPLETE", "The payment was not captured.");
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
    include: { order: { include: { items: true } } },
  });
  if (!payment) throw new ApiError(404, "NOT_FOUND", "Payment not found.");
  if (payment.status === "CAPTURED") {
    const existing = await prisma.order.findUnique({ where: { id: payment.orderId }, include: orderInclude });
    return presentOrder(existing!);
  }
  if (payment.order.status !== "PENDING") {
    throw new ApiError(409, "ORDER_STATE", "This order is no longer awaiting payment.");
  }
  const expected = toPaise(payment.amount);
  if (Number(remote.amount) !== expected) {
    throw new ApiError(400, "AMOUNT_MISMATCH", "The paid amount does not match the order.");
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id }, include: { order: { include: { items: true } } } });
    if (!current || current.status === "CAPTURED") return;
    for (const item of current.order.items) {
      if (!item.variantId) continue;
      const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
      if (!inventory) throw new ApiError(409, "STOCK", "Inventory could not be confirmed.");
      await captureReserved(tx, inventory.id, item.quantity, item.productName);
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        });
      }
    }
    await tx.payment.update({
      where: { id: current.id },
      data: {
        status: "CAPTURED",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.signature,
      },
    });
    await tx.order.update({ where: { id: current.orderId }, data: { status: "CONFIRMED" } });
  });

  const fresh = await prisma.order.findUnique({ where: { id: payment.orderId }, include: orderInclude });
  if (fresh) {
    await sendEmail(
      fresh.email,
      `Payment received for ${fresh.orderNumber}`,
      orderEmailHtml({
        title: "Payment received",
        intro: "Your payment is confirmed and we are preparing the order.",
        orderNumber: fresh.orderNumber,
        total: formatInr(toPaise(fresh.grandTotal)),
        lines: fresh.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: formatInr(toPaise(item.unitPrice) * item.quantity),
        })),
      }),
    ).catch((error) => console.error(error));
  }
  return presentOrder(fresh!);
}

export async function markPaymentFailed(razorpayOrderId: string) {
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
  if (!payment || payment.status !== "PENDING") return;
  await cancelUnpaidOrder(payment.orderId, "Payment failed.");
}

export async function releaseExpiredReservations() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      payment: { method: "RAZORPAY", status: "PENDING" },
    },
    select: { id: true },
  });
  for (const order of stale) {
    await cancelUnpaidOrder(order.id, "Payment window expired.");
  }
  return { released: stale.length };
}
