import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/api-error";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function fail(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return NextResponse.json(
    { success: false as const, error: { code, message, fields } },
    { status },
  );
}

export function handle(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.status, error.code, error.message, error.fields);
  }
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fields[key]) fields[key] = issue.message;
    }
    return fail(422, "VALIDATION_ERROR", "Check the highlighted fields.", fields);
  }
  console.error(error);
  return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "FORBIDDEN", "Cross-origin request rejected.");
  }
  if (!host || originHost !== host) {
    throw new ApiError(403, "FORBIDDEN", "Cross-origin request rejected.");
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
