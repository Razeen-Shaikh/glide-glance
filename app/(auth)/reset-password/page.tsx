"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: params.get("email"),
          token: params.get("token"),
          password: data.get("password"),
        }),
      });
      toast.success("Password updated");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset the password.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-4">
      <h1 className="text-3xl font-medium">Choose a new password</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="New password" htmlFor="password">
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={pending}>
          Update password
        </Button>
      </form>
    </main>
  );
}
