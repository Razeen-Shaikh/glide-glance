"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import { loginSchema } from "@/validations";
import type { z } from "zod";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/account";
  const [pending, setPending] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setPending(true);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setPending(false);
    if (!result || result.error) {
      toast.error("Email or password is incorrect.");
      return;
    }
    await api("/api/cart/merge", { method: "POST" }).catch(() => undefined);
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center gap-6 px-4">
      <div>
        <p className="font-display text-sm font-semibold tracking-tight text-primary">Glide Glance</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Sign in</h1>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <Button type="submit" disabled={pending}>
          Sign in
        </Button>
      </form>
      {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" ? (
        <Button type="button" variant="outline" onClick={() => signIn("google", { callbackUrl })}>
          Continue with Google
        </Button>
      ) : null}
      <p className="text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline">
          Forgot password
        </Link>
        {" · "}
        <Link href="/register" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
