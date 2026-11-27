import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="grid gap-4">
        <p className="font-display text-sm font-semibold text-primary">Glide Glance</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Page not found</h1>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to the store
        </Link>
      </div>
    </main>
  );
}
