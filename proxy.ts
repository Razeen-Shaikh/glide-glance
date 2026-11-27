import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  clearAuthSessionCookiesOnResponse,
  hasAuthSessionCookie,
} from "@/lib/auth-cookies";
import { GUEST_COOKIE, cookieOptions } from "@/lib/constants";

function isAccountPath(pathname: string) {
  return pathname === "/account" || pathname.startsWith("/account/");
}

function isRscRequest(request: NextRequest) {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.has("next-router-segment-prefetch") ||
    request.headers.get("accept")?.includes("text/x-component") === true
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let token: Awaited<ReturnType<typeof getToken>> = null;
  try {
    token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  } catch {
    token = null;
  }
  const staleSession = hasAuthSessionCookie(request.cookies) && !token;

  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    const redirect = NextResponse.redirect(url);
    return staleSession ? clearAuthSessionCookiesOnResponse(redirect, request.cookies) : redirect;
  }

  if (isAccountPath(pathname) && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    const redirect = NextResponse.redirect(url);
    return staleSession ? clearAuthSessionCookiesOnResponse(redirect, request.cookies) : redirect;
  }

  // Mutating cookies on RSC/prefetch responses breaks App Router soft navigations
  // with "An unexpected response was received from the server."
  if (isRscRequest(request) || pathname.startsWith("/api/")) {
    if (!staleSession) return NextResponse.next();
    return clearAuthSessionCookiesOnResponse(NextResponse.next(), request.cookies);
  }

  const response = NextResponse.next();
  if (staleSession) clearAuthSessionCookiesOnResponse(response, request.cookies);
  if (!request.cookies.get(GUEST_COOKIE)) {
    response.cookies.set(GUEST_COOKIE, crypto.randomUUID(), cookieOptions);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)"],
};
