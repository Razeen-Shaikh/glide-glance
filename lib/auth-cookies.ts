import type { NextResponse } from "next/server";

const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function isAuthSessionCookie(name: string) {
  return SESSION_COOKIE_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}.`));
}

export function hasAuthSessionCookie(requestCookies: { getAll(): { name: string }[] }) {
  return requestCookies.getAll().some((cookie) => isAuthSessionCookie(cookie.name));
}

export function clearAuthSessionCookiesOnResponse(
  response: NextResponse,
  requestCookies: { getAll(): { name: string }[] },
) {
  for (const cookie of requestCookies.getAll()) {
    if (isAuthSessionCookie(cookie.name)) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }
  return response;
}
