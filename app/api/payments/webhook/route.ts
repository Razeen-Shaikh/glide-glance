import { handle, ok } from "@/lib/http";
import { ApiError } from "@/lib/api-error";
import { verifyWebhookSignature } from "@/lib/signatures";
import { captureVerifiedPayment, markPaymentFailed } from "@/services/orders";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503, "PAYMENTS_UNAVAILABLE", "Webhook secret is not configured.");
    const raw = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    if (!verifyWebhookSignature(raw, signature, secret)) {
      throw new ApiError(400, "INVALID_SIGNATURE", "Webhook signature verification failed.");
    }
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string } };
        refund?: { entity?: { id?: string; payment_id?: string } };
      };
    };
    const payment = event.payload?.payment?.entity;
    if (event.event === "payment.captured" && payment?.id && payment.order_id) {
      await captureVerifiedPayment({ razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id });
    }
    if (event.event === "payment.failed" && payment?.order_id) {
      await markPaymentFailed(payment.order_id);
    }
    if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      if (refund?.payment_id) {
        await prisma.payment.updateMany({
          where: { razorpayPaymentId: refund.payment_id },
          data: { status: "REFUNDED", refundId: refund.id },
        });
      }
    }
    return ok({ received: true });
  } catch (error) {
    return handle(error);
  }
}
