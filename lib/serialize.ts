import { discountPercent, toPaise } from "@/lib/money";

type Money = { toString(): string };

export type CardSource = {
  id: string;
  name: string;
  slug: string;
  price: Money;
  compareAtPrice: Money | null;
  ratingAverage: Money;
  ratingCount: number;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
  variants: { inventory: { quantityAvailable: number } | null }[];
};

export function serializeCard(product: CardSource) {
  const price = toPaise(product.price);
  const compare = product.compareAtPrice ? toPaise(product.compareAtPrice) : null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    discountPercent: discountPercent(price, compare),
    ratingAverage: Number(product.ratingAverage.toString()),
    ratingCount: product.ratingCount,
    brand: product.brand.name,
    brandSlug: product.brand.slug,
    category: product.category.name,
    categorySlug: product.category.slug,
    image: product.images[0]?.url ?? null,
    imageAlt: product.images[0]?.alt ?? product.name,
    inStock: product.variants.some((variant) => (variant.inventory?.quantityAvailable ?? 0) > 0),
  };
}

export function moneyString(value: Money | null | undefined) {
  return value ? value.toString() : null;
}
