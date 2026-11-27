import { assertSameOrigin, handle, ok } from "@/lib/http";
import { captureVerifiedPayment } from "@/services/orders";
import { paymentVerifySchema } from "@/validations";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = paymentVerifySchema.parse(await request.json());
    const order = await captureVerifiedPayment({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    return ok(order);
  } catch (error) {
    return handle(error);
  }
}
