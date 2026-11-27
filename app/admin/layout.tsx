import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login?callbackUrl=/admin");
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="font-display text-lg font-semibold tracking-tight">
            Glide Glance admin
          </Link>
          <Link href="/" className="text-sm text-muted-foreground">
            View store
          </Link>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
