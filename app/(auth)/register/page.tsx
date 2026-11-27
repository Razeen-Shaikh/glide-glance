"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await signIn("credentials", {
        email: data.get("email"),
        password: data.get("password"),
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
        return;
      }
      await api("/api/cart/merge", { method: "POST" }).catch(() => undefined);
      router.push("/account");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-4">
      <div>
        <p className="font-display text-sm font-semibold tracking-tight text-primary">Glide Glance</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Create an account</h1>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={pending}>
          Create account
        </Button>
      </form>
      <Link href="/login" className="text-sm underline">
        Already have an account
      </Link>
    </main>
  );
}
