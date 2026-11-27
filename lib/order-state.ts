export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  CANCELLED: [],
  RETURNED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function customerCanCancel(status: OrderStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED" || status === "PROCESSING";
}

export function returnWindowOpen(deliveredAt: Date, now = new Date()): boolean {
  const windowMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - deliveredAt.getTime() <= windowMs;
}

export const TRACKING_STEPS = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export function trackingIndex(status: OrderStatus): number {
  if (status === "PENDING") return -1;
  if (status === "CANCELLED" || status === "RETURN_REQUESTED" || status === "RETURNED") {
    return TRACKING_STEPS.length;
  }
  return TRACKING_STEPS.indexOf(status as (typeof TRACKING_STEPS)[number]);
}
