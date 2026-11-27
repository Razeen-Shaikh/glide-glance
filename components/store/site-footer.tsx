import Link from "next/link";
import { NewsletterForm } from "@/components/store/newsletter-form";

const columns = [
  {
    title: "Shop",
    links: [
      ["All products", "/products"],
      ["New arrivals", "/products?sort=newest"],
      ["Offers", "/products?sort=popularity"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Shipping", "/help/shipping"],
      ["Returns", "/help/returns"],
      ["Track an order", "/track"],
      ["Contact", "/help/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Privacy", "/help/privacy"],
      ["Terms", "/help/terms"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/80 bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="grid gap-4">
          <p className="font-display text-2xl font-semibold tracking-tight">Glide Glance</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Considered goods for everyday living, packed in Bengaluru and shipped across India.
          </p>
          <NewsletterForm />
        </div>
        {columns.map((column) => (
          <div key={column.title} className="grid content-start gap-3 text-sm">
            <p className="font-medium tracking-wide">{column.title}</p>
            {column.links.map(([label, href]) => (
              <Link key={label} href={href} className="text-muted-foreground transition hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-border/80">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">Glide Glance. Prices include GST.</p>
      </div>
    </footer>
  );
}
