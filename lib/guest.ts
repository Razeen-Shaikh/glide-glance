import "server-only";
import { cookies } from "next/headers";
import { GUEST_COOKIE, ORDER_ACCESS_COOKIE, cookieOptions } from "@/lib/constants";

export async function readGuestToken() {
  const jar = await cookies();
  return jar.get(GUEST_COOKIE)?.value ?? null;
}

export async function ensureGuestToken() {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const token = crypto.randomUUID();
  jar.set(GUEST_COOKIE, token, cookieOptions);
  return token;
}

export async function readOrderAccess(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(ORDER_ACCESS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, 10);
  } catch {
    return [];
  }
}

export async function rememberOrder(orderId: string) {
  const jar = await cookies();
  const current = await readOrderAccess();
  const next = [orderId, ...current.filter((id) => id !== orderId)].slice(0, 10);
  jar.set(ORDER_ACCESS_COOKIE, JSON.stringify(next), cookieOptions);
}
