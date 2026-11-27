"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { api } from "@/lib/api-client";

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [pending, setPending] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api(`/api/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, title: data.get("title"), body: data.get("body") }),
      });
      toast.success("Review saved");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in to review.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-border p-4">
      <h3 className="font-medium">Write a review</h3>
      <label className="grid gap-1 text-sm" htmlFor="rating">
        Rating
        <select id="rating" value={rating} onChange={(event) => setRating(Number(event.target.value))} className="h-11 rounded-xl border border-input bg-card px-3">
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} stars
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm" htmlFor="review-title">
        Title
        <input id="review-title" name="title" className="h-11 rounded-xl border border-input bg-card px-3" />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="review-body">
        Review
        <Textarea id="review-body" name="body" required minLength={10} />
      </label>
      <Button type="submit" disabled={pending}>
        Publish review
      </Button>
    </form>
  );
}
