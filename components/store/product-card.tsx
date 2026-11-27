import Image from "next/image";
import Link from "next/link";
import { Money, Stars } from "@/components/store/money";

export type CardModel = {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  discountPercent: number | null;
  ratingAverage: number;
  ratingCount: number;
  brand: string;
  image: string | null;
  imageAlt: string;
  inStock: boolean;
};

export function ProductCard({ product }: { product: CardModel }) {
  return (
    <article className="group grid gap-3">
      <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-muted">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : null}
        {product.discountPercent ? (
          <span className="absolute left-0 top-0 bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {product.discountPercent}% off
          </span>
        ) : null}
        {!product.inStock ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/90 px-3 py-2 text-xs text-background">Sold out</span>
        ) : null}
      </Link>
      <div className="grid gap-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{product.brand}</p>
        <Link href={`/products/${product.slug}`} className="font-display text-lg font-medium leading-tight transition hover:text-primary">
          {product.name}
        </Link>
        <div className="flex items-baseline gap-2">
          <Money value={product.price} className="font-medium" />
          {product.compareAtPrice ? (
            <Money value={product.compareAtPrice} className="text-sm text-muted-foreground line-through" />
          ) : null}
        </div>
        <Stars rating={product.ratingAverage} count={product.ratingCount} />
      </div>
    </article>
  );
}

export function ProductRow({ title, products, href }: { title: string; products: CardModel[]; href?: string }) {
  if (products.length === 0) return null;
  return (
    <section className="grid gap-6">
      <div className="flex items-end justify-between gap-4 border-b border-border/80 pb-3">
        <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="grid gap-3">
          <div className="aspect-[4/5] animate-pulse bg-muted" />
          <div className="h-4 w-2/3 animate-pulse bg-muted" />
          <div className="h-4 w-1/3 animate-pulse bg-muted" />
        </div>
      ))}
    </div>
  );
}
