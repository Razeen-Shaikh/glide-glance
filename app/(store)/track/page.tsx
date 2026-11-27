import { TrackForm } from "@/components/store/track-form";

export const metadata = { title: "Track an order" };

export default function TrackPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-4xl font-medium">Track an order</h1>
      <p className="text-muted-foreground">Use the order number and the email from checkout.</p>
      <TrackForm />
    </div>
  );
}
