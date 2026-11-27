import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { OrderTimeline } from "@/components/store/order-timeline";
import { Money } from "@/components/store/money";
import { getActor } from "@/lib/actor";
import { ApiError } from "@/lib/api-error";
import { getOrderForActor } from "@/services/orders";
import { TrackForm } from "@/components/store/track-form";

export default function ConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-muted" />}>
      <Confirmation params={params} />
    </Suspense>
  );
}

async function Confirmation({ params }: { params: Promise<{ orderNumber: string }> }) {
  await connection();
  const { orderNumber } = await params;
  const actor = await getActor();
  try {
    const order = await getOrderForActor(orderNumber, actor.userId, actor.orderIds);
    return (
      <div className="grid gap-6">
        <p className="text-sm text-muted-foreground">Order {order.orderNumber}</p>
        <h1 className="text-4xl font-medium">{order.status === "PENDING" ? "Payment pending" : "Order confirmed"}</h1>
        <OrderTimeline status={order.status} />
        <p>
          Total <Money value={order.grandTotal} className="font-medium" /> · {order.payment?.method === "COD" ? "Cash on delivery" : "Prepaid"}
        </p>
        {order.status === "PENDING" ? (
          <p className="text-muted-foreground">If the payment window closed, the reserved stock is released automatically.</p>
        ) : (
          <p className="text-muted-foreground">A confirmation was sent to {order.email} when email delivery is configured.</p>
        )}
        <Link href="/account/orders" className="text-sm underline">
          View orders
        </Link>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return (
        <div className="grid gap-4">
          <h1 className="text-3xl font-medium">Find your order</h1>
          <TrackForm orderNumber={orderNumber} />
        </div>
      );
    }
    throw error;
  }
}
