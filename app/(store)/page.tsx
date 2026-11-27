import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { GridSkeleton, ProductRow, type CardModel } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { getHomeCatalog } from "@/services/catalog";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeFallback() {
  return (
    <div className="grid gap-16">
      <div className="relative -mt-8 h-[calc(100svh-7.5rem)] w-full md:-mt-10">
        <div className="absolute inset-y-0 left-1/2 w-screen max-w-[100vw] -translate-x-1/2 animate-pulse bg-muted" />
      </div>
      <GridSkeleton />
    </div>
  );
}

async function HomeContent() {
  await connection();
  const home = await getHomeCatalog();
  const hero = home.featured[0] ?? home.newArrivals[0] ?? null;
  return (
    <div className="grid gap-20">
      <Hero product={hero} />
      <section className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <div className="grid gap-3">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Shop by room</p>
          <h2 className="font-display max-w-sm text-4xl font-semibold tracking-tight">Four quiet departments.</h2>
        </div>
        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
          {home.categories.map((category) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group bg-card/80 px-5 py-6 transition hover:bg-accent"
            >
              <h3 className="font-display text-xl font-medium transition group-hover:text-primary">{category.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>
      <ProductRow title="Featured" products={home.featured} href="/products" />
      <ProductRow title="Trending" products={home.trending} href="/products?sort=popularity" />
      <ProductRow title="Best sellers" products={home.bestSellers} href="/products?sort=popularity" />
      <ProductRow title="New arrivals" products={home.newArrivals} href="/products?sort=newest" />
      <ProductRow title="Special offers" products={home.offers} href="/products" />
      {home.categories.map((category) => (
        <ProductRow
          key={category.slug}
          title={category.name}
          products={category.products}
          href={`/products?category=${category.slug}`}
        />
      ))}
    </div>
  );
}

function Hero({ product }: { product: CardModel | null }) {
  return (
    <div className="relative -mt-8 h-[calc(100svh-7.5rem)] w-full md:-mt-10">
      <section className="absolute inset-y-0 left-1/2 isolate w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden bg-foreground text-background">
        {product?.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            priority
            loading="eager"
            sizes="100vw"
            className="motion-drift object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.35_0.05_55),oklch(0.22_0.03_250))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/60 to-foreground/20" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end gap-4 px-4 pb-10 pt-16 md:gap-5 md:pb-12">
          <p className="motion-rise font-display text-4xl font-semibold tracking-tight md:text-6xl lg:text-7xl">Glide Glance</p>
          <h1 className="motion-rise-delay max-w-xl font-display text-2xl font-medium tracking-tight text-balance md:text-4xl">
            Objects with a longer life.
          </h1>
          <p className="motion-rise-delay max-w-md text-sm leading-relaxed text-background/80">
            Apparel, footwear, and home pieces chosen for material, fit, and the way they wear in. Free standard shipping over ₹999.
          </p>
          <div className="motion-rise-delay flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
              <Link href="/products">Shop the edit</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background">
              <Link href="/products?sort=newest">New arrivals</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
