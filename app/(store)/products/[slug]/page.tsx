import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProductRow } from "@/components/store/product-card";
import { Money, Stars } from "@/components/store/money";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { Remember, RecentlyViewed } from "@/components/store/recently-viewed";
import { ReviewForm } from "@/components/store/review-form";
import { ApiError } from "@/lib/api-error";
import { getProductBySlug } from "@/services/catalog";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-muted" />}>
      <Product params={params} />
    </Suspense>
  );
}

async function Product({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    const specs = Object.entries(product.specifications);
    return (
      <div className="grid gap-14">
        <Remember id={product.id} />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="grid gap-3">
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              {product.images[0] ? (
                <Image src={product.images[0].url} alt={product.images[0].alt} fill priority className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
              ) : null}
            </div>
            {product.images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(1).map((image) => (
                  <div key={image.url} className="relative aspect-square overflow-hidden bg-muted">
                    <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="20vw" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid content-start gap-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Link href={`/products?brand=${product.brandSlug}`}>{product.brand}</Link>
              {" · "}
              <Link href={`/products?category=${product.categorySlug}`}>{product.category}</Link>
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{product.name}</h1>
            <Stars rating={product.ratingAverage} count={product.ratingCount} />
            {product.compareAtPrice ? (
              <p className="text-sm text-muted-foreground">
                Was <Money value={product.compareAtPrice} className="line-through" />
              </p>
            ) : null}
            <p className="max-w-prose leading-7 text-muted-foreground">{product.description}</p>
            <PurchasePanel productId={product.id} variants={product.variants} />
            <p className="text-sm text-muted-foreground">GST {product.gstRate}% included. Standard shipping is free over ₹999.</p>
          </div>
        </div>
        {specs.length > 0 ? (
          <section>
            <h2 className="font-display text-3xl font-semibold">Specifications</h2>
            <dl className="mt-4 divide-y divide-border border-y border-border">
              {specs.map(([name, value]) => (
                <div key={name} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
                  <dt className="text-sm text-muted-foreground">{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <section className="grid gap-4">
          <h2 className="font-display text-3xl font-semibold">Reviews</h2>
          {product.reviews.length === 0 ? <p className="text-muted-foreground">No reviews yet.</p> : null}
          <div className="grid gap-4">
            {product.reviews.map((review) => (
              <article key={review.id} className="border-b border-border py-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{review.title || review.author}</h3>
                  <Stars rating={review.rating} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {review.author}
                  {review.verifiedPurchase ? " · Verified purchase" : ""}
                </p>
                <p className="mt-2">{review.body}</p>
              </article>
            ))}
          </div>
          <ReviewForm productId={product.id} />
        </section>
        <ProductRow title="Related" products={product.related} />
        <RecentlyViewed excludeId={product.id} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
