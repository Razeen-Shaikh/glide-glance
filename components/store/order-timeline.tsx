import { TRACKING_STEPS, trackingIndex, type OrderStatus } from "@/lib/order-state";

const labels: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "RETURN_REQUESTED" || status === "RETURNED" || status === "PENDING") {
    return <p className="inline-flex rounded-md bg-muted px-3 py-1 text-sm">{status.replaceAll("_", " ")}</p>;
  }
  const current = trackingIndex(status);
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {TRACKING_STEPS.map((step, index) => (
        <li
          key={step}
          className={`border px-3 py-3 text-sm ${index <= current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/50"}`}
        >
          {labels[step]}
        </li>
      ))}
    </ol>
  );
}
