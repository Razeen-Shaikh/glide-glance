import "server-only";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toPaise } from "@/lib/money";
import { couponSchema } from "@/validations";
import { presentOrder } from "@/services/orders";
import { ApiError } from "@/lib/api-error";

const paid = { status: { notIn: ["PENDING", "CANCELLED"] as OrderStatus[] } };

export async function getDashboard() {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [revenue, orders, customers, products, pendingOrders, recent, rangeOrders, inventories, best, growthUsers] =
    await Promise.all([
      prisma.order.aggregate({ where: paid, _sum: { grandTotal: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count({ where: { status: "PUBLISHED" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { payment: true, items: true, shipment: true, returnRequest: true } }),
      prisma.order.findMany({
        where: { ...paid, createdAt: { gte: since } },
        select: { createdAt: true, grandTotal: true },
      }),
      prisma.inventory.findMany({
        include: { variant: { include: { product: { select: { name: true } } } } },
        orderBy: { quantityAvailable: "asc" },
      }),
      prisma.product.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { salesCount: "desc" },
        take: 5,
        select: { name: true, slug: true, salesCount: true, price: true },
      }),
      prisma.user.findMany({
        where: { role: "CUSTOMER", createdAt: { gte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true },
      }),
    ]);

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const total = rangeOrders
      .filter((order) => order.createdAt.toISOString().slice(0, 10) === key)
      .reduce((sum, order) => sum + toPaise(order.grandTotal), 0);
    return { date: key, totalPaise: total };
  });

  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date();
    start.setDate(start.getDate() - (7 - index) * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      week: start.toISOString().slice(0, 10),
      count: growthUsers.filter((user) => user.createdAt >= start && user.createdAt < end).length,
    };
  });

  const statusGroups = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });

  return {
    revenue: revenue._sum.grandTotal?.toString() ?? "0.00",
    orders,
    customers,
    products,
    pendingOrders,
    lowStock: inventories
      .filter((row) => row.quantityAvailable <= row.lowStockThreshold)
      .slice(0, 8)
      .map((row) => ({
        sku: row.variant.sku,
        productName: row.variant.product.name,
        available: row.quantityAvailable,
        threshold: row.lowStockThreshold,
      })),
    recentOrders: recent.map((order) => presentOrder(order)),
    revenueByDay: days,
    bestSellers: best.map((product) => ({
      name: product.name,
      slug: product.slug,
      units: product.salesCount,
      price: product.price.toString(),
    })),
    customerGrowth: weeks,
    statusCounts: Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])),
  };
}

export async function adminOrders(params: URLSearchParams) {
  const q = params.get("q")?.trim();
  const status = params.get("status")?.trim();
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { items: true, payment: true, shipment: true, returnRequest: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return orders.map((order) => presentOrder(order));
}

export async function adminCustomers(params: URLSearchParams) {
  const q = params.get("q")?.trim();
  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  return customers.map((customer) => ({ ...customer, createdAt: customer.createdAt.toISOString() }));
}

export async function adminCustomer(id: string) {
  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      role: true,
      createdAt: true,
      orders: { orderBy: { createdAt: "desc" }, include: { items: true, payment: true, shipment: true, returnRequest: true } },
    },
  });
  if (!customer || customer.role === "ADMIN") throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  return {
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    orders: customer.orders.map((order) => presentOrder(order)),
  };
}

export async function setCustomerActive(id: string, isActive: boolean) {
  const customer = await prisma.user.findUnique({ where: { id } });
  if (!customer || customer.role === "ADMIN") throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  return prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } });
}

export async function listCoupons() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } },
  });
  return coupons.map(serializeCoupon);
}

export async function saveCoupon(input: unknown, id?: string) {
  const data = couponSchema.parse(input);
  if (data.type === "PERCENT" && Number(data.value) > 100) {
    throw new ApiError(422, "VALIDATION_ERROR", "A percentage coupon cannot exceed 100.");
  }
  const payload = {
    code: data.code,
    type: data.type,
    value: data.value,
    minOrderAmount: data.minOrderAmount,
    maxDiscountAmount: data.maxDiscountAmount || null,
    usageLimit: data.usageLimit ?? null,
    usageLimitPerUser: data.usageLimitPerUser,
    startsAt: new Date(data.startsAt),
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    isActive: data.isActive,
  };
  const coupon = id
    ? await prisma.coupon.update({ where: { id }, data: payload, include: { _count: { select: { usages: true } } } })
    : await prisma.coupon.create({ data: payload, include: { _count: { select: { usages: true } } } });
  return serializeCoupon(coupon);
}

export async function deleteCoupon(id: string) {
  const used = await prisma.couponUsage.count({ where: { couponId: id } });
  if (used > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true };
  }
  await prisma.coupon.delete({ where: { id } });
  return { deactivated: false };
}

function serializeCoupon(coupon: {
  id: string;
  code: string;
  type: string;
  value: { toString(): string };
  minOrderAmount: { toString(): string };
  maxDiscountAmount: { toString(): string } | null;
  usageLimit: number | null;
  usageLimitPerUser: number;
  startsAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  _count: { usages: number };
}) {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value.toString(),
    minOrderAmount: coupon.minOrderAmount.toString(),
    maxDiscountAmount: coupon.maxDiscountAmount?.toString() ?? null,
    usageLimit: coupon.usageLimit,
    usageLimitPerUser: coupon.usageLimitPerUser,
    startsAt: coupon.startsAt.toISOString(),
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
    isActive: coupon.isActive,
    used: coupon._count.usages,
  };
}

export async function listInventory() {
  const rows = await prisma.inventory.findMany({
    include: {
      variant: { include: { product: { select: { name: true, slug: true } }, attributes: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { quantityAvailable: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    sku: row.variant.sku,
    productName: row.variant.product.name,
    slug: row.variant.product.slug,
    attributes: row.variant.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(", "),
    quantityOnHand: row.quantityOnHand,
    quantityReserved: row.quantityReserved,
    quantityAvailable: row.quantityAvailable,
    lowStockThreshold: row.lowStockThreshold,
    low: row.quantityAvailable <= row.lowStockThreshold,
    transactions: row.transactions.map((entry) => ({
      id: entry.id,
      reason: entry.reason,
      quantity: entry.quantity,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  }));
}
