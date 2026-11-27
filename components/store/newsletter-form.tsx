"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function NewsletterForm() {
  const [pending, setPending] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/newsletter", { method: "POST", body: JSON.stringify({ email: data.get("email") }) });
      toast.success("You are on the list.");
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not subscribe.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={onSubmit}
      className="flex h-11 max-w-sm overflow-hidden rounded-md border border-input bg-card"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="Email address"
        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none focus-visible:ring-0"
      />
      <Button
        type="submit"
        disabled={pending}
        className="h-full shrink-0 rounded-none px-4"
      >
        Join
      </Button>
    </form>
  );
}
