"use client";

import { Button } from "@/components/ui/button";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid gap-4 py-16 text-center">
      <h1 className="text-3xl font-medium">Something went wrong</h1>
      <p className="text-muted-foreground">The page could not be loaded. Try again in a moment.</p>
      <div>
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
