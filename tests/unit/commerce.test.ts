import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { discountPercent, paiseToDecimalString, toPaise } from "@/lib/money";
import { canTransition, customerCanCancel, returnWindowOpen } from "@/lib/order-state";
import { quoteOrder, shippingPaise } from "@/lib/pricing";
import { resetRateLimits, rateLimit } from "@/lib/rate-limit";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/signatures";
import { ApiError } from "@/lib/api-error";

describe("money", () => {
  it("converts rupees and paise without float drift", () => {
    expect(toPaise("2499.50")).toBe(249950);
    expect(toPaise("10")).toBe(1000);
    expect(paiseToDecimalString(249950)).toBe("2499.50");
    expect(discountPercent(80000, 100000)).toBe(20);
    expect(discountPercent(100000, 80000)).toBeNull();
  });
});

describe("pricing", () => {
  const lines = [
    { unitPricePaise: 100000, quantity: 1, gstRate: 18 },
    { unitPricePaise: 50000, quantity: 2, gstRate: 5 },
  ];

  it("applies a capped percentage coupon and free standard shipping", () => {
    const quote = quoteOrder(
      lines,
      { type: "PERCENT", value: "20", minOrderAmount: "1000", maxDiscountAmount: "300" },
      "STANDARD",
    );
    expect(quote.subtotalPaise).toBe(200000);
    expect(quote.discountPaise).toBe(30000);
    expect(quote.shippingPaise).toBe(0);
    expect(quote.grandPaise).toBe(170000);
    expect(quote.taxPaise).toBeGreaterThan(0);
  });

  it("charges standard shipping below the threshold and express always", () => {
    expect(shippingPaise("STANDARD", 50000)).toBe(4900);
    expect(shippingPaise("STANDARD", 99900)).toBe(0);
    expect(shippingPaise("EXPRESS", 200000)).toBe(9900);
  });

  it("rejects a coupon below the minimum with no discount", () => {
    const quote = quoteOrder(
      [{ unitPricePaise: 10000, quantity: 1, gstRate: 18 }],
      { type: "FIXED", value: "200", minOrderAmount: "1500", maxDiscountAmount: null },
      "STANDARD",
    );
    expect(quote.discountPaise).toBe(0);
    expect(quote.couponMessage).toContain("minimum");
  });
});

describe("order state", () => {
  it("allows fulfillment forward and customer cancellation only before shipping", () => {
    expect(canTransition("CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(customerCanCancel("PROCESSING")).toBe(true);
    expect(customerCanCancel("SHIPPED")).toBe(false);
  });

  it("keeps the return window to seven days", () => {
    const now = new Date("2026-11-25T00:00:00Z");
    expect(returnWindowOpen(new Date("2026-11-20T00:00:00Z"), now)).toBe(true);
    expect(returnWindowOpen(new Date("2026-11-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("razorpay signatures", () => {
  it("accepts a valid payment signature and rejects tampering", () => {
    const secret = "razorpay_test_secret";
    const signature = crypto.createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyPaymentSignature("order_1", "pay_1", signature, secret)).toBe(true);
    expect(verifyPaymentSignature("order_1", "pay_1", "not-the-signature", secret)).toBe(false);
    const body = JSON.stringify({ event: "payment.captured" });
    const webhook = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, webhook, secret)).toBe(true);
    expect(verifyWebhookSignature(body, webhook, "other")).toBe(false);
  });
});

describe("rate limit", () => {
  it("blocks after the configured number of calls", () => {
    resetRateLimits();
    rateLimit("unit", 2, 60_000);
    rateLimit("unit", 2, 60_000);
    expect(() => rateLimit("unit", 2, 60_000)).toThrow(ApiError);
  });
});
