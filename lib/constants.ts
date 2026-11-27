export const GUEST_COOKIE = "gg_guest";
export const ORDER_ACCESS_COOKIE = "gg_orders";
export const MAX_LINE_QUANTITY = 10;
export const RESERVATION_MINUTES = 30;
export const PAGE_SIZE = 12;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
