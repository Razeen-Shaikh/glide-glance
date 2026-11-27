import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { AccountNav } from "@/components/store/account-nav";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-muted" />}>
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}

async function AccountShell({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/account");
  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <AccountNav />
      <div>{children}</div>
    </div>
  );
}
