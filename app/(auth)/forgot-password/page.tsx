"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: data.get("email") }) });
      toast.success("If an account exists, a reset link is on its way.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset link.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-4">
      <h1 className="text-3xl font-medium">Reset password</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required />
        </Field>
        <Button type="submit" disabled={pending}>
          Send reset link
        </Button>
      </form>
    </main>
  );
}
