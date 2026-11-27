import "server-only";
import { ApiError } from "@/lib/api-error";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export async function getRazorpay() {
  if (!razorpayConfigured()) {
    throw new ApiError(503, "PAYMENTS_UNAVAILABLE", "Online payment is not configured.");
  }
  const Razorpay = (await import("razorpay")).default;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export function publicRazorpayKey() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}
