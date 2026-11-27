import { Suspense } from "react";
import { connection } from "next/server";
import { GridSkeleton, ProductCard } from "@/components/store/product-card";
import { LiveSearch } from "@/components/store/live-search";
import { listProducts } from "@/services/catalog";
import Link from "next/link";

export const metadata = { title: "Shop" };

export default function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <Catalog searchParams={searchParams} />
    </Suspense>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }
  const result = await listProducts(params);
  const page = Number(params.get("page") || 1);
  const field =
    "h-10 w-full rounded-md border border-input bg-card/80 px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
  const hasFilters = [...params.keys()].some((key) => key !== "page" && params.get(key));
  const formKeyParams = new URLSearchParams(params);
  formKeyParams.delete("q");
  return (
    <div className="grid gap-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="flex items-center gap-4 text-sm">
          <p className="text-muted-foreground">{result.total} pieces</p>
          {hasFilters ? (
            <Link href="/products" className="text-muted-foreground underline-offset-4 hover:underline">
              Clear
            </Link>
          ) : null}
        </div>
      </div>

      <form key={formKeyParams.toString() || "all"} action="/products" className="min-w-0">
        <div className="-mx-4 flex items-end gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <label className="flex w-44 shrink-0 flex-col gap-1.5 text-sm" htmlFor="q">
            <span className="leading-none font-medium">Search</span>
            <LiveSearch id="q" className={field} />
          </label>
          <label className="flex w-40 shrink-0 flex-col gap-1.5 text-sm" htmlFor="category">
            <span className="leading-none font-medium">Category</span>
            <select id="category" name="category" defaultValue={params.get("category") ?? ""} className={field}>
              <option value="">All</option>
              {result.categories?.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-40 shrink-0 flex-col gap-1.5 text-sm" htmlFor="brand">
            <span className="leading-none font-medium">Brand</span>
            <select id="brand" name="brand" defaultValue={params.get("brand") ?? ""} className={field}>
              <option value="">All</option>
              {result.brands?.map((brand) => (
                <option key={brand.slug} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex w-52 shrink-0 flex-col gap-1.5 text-sm">
            <span className="leading-none font-medium">Price</span>
            <div className="flex h-10 items-center rounded-md border border-input bg-card/80 px-3 focus-within:ring-2 focus-within:ring-ring">
              <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                ₹
              </span>
              <label className="sr-only" htmlFor="minPrice">
                Minimum price
              </label>
              <input
                id="minPrice"
                name="minPrice"
                inputMode="numeric"
                placeholder="Min"
                defaultValue={params.get("minPrice") ?? ""}
                className="h-full w-full min-w-0 bg-transparent px-1.5 outline-none placeholder:text-muted-foreground"
              />
              <span className="shrink-0 text-muted-foreground" aria-hidden="true">
                –
              </span>
              <label className="sr-only" htmlFor="maxPrice">
                Maximum price
              </label>
              <input
                id="maxPrice"
                name="maxPrice"
                inputMode="numeric"
                placeholder="Max"
                defaultValue={params.get("maxPrice") ?? ""}
                className="h-full w-full min-w-0 bg-transparent px-1.5 outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <label className="flex w-36 shrink-0 flex-col gap-1.5 text-sm" htmlFor="rating">
            <span className="leading-none font-medium">Rating</span>
            <select id="rating" name="rating" defaultValue={params.get("rating") ?? ""} className={field}>
              <option value="">Any</option>
              <option value="4">4 and up</option>
              <option value="3">3 and up</option>
            </select>
          </label>
          <label className="flex w-36 shrink-0 flex-col gap-1.5 text-sm" htmlFor="availability">
            <span className="leading-none font-medium">Stock</span>
            <select id="availability" name="availability" defaultValue={params.get("availability") ?? ""} className={field}>
              <option value="">Any</option>
              <option value="in_stock">In stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </label>
          <label className="flex w-44 shrink-0 flex-col gap-1.5 text-sm" htmlFor="sort">
            <span className="leading-none font-medium">Sort</span>
            <select id="sort" name="sort" defaultValue={params.get("sort") ?? "newest"} className={field}>
              <option value="newest">Newest</option>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
          <button className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110" type="submit">
            Apply
          </button>
        </div>
      </form>

      <div className="grid gap-6">
        {result.items.length === 0 ? (
          <div className="border border-dashed border-border p-10 text-center">
            <h2 className="font-display text-2xl font-semibold">No matches</h2>
            <p className="mt-2 text-muted-foreground">Try a broader search or clear a filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <nav className="flex gap-3" aria-label="Pagination">
          {page > 1 ? (
            <Link className="rounded-md border border-border px-4 py-2 text-sm transition hover:border-foreground" href={pageHref(params, page - 1)}>
              Previous
            </Link>
          ) : null}
          {page < result.pages ? (
            <Link className="rounded-md border border-border px-4 py-2 text-sm transition hover:border-foreground" href={pageHref(params, page + 1)}>
              Next
            </Link>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/products?${next.toString()}`;
}
