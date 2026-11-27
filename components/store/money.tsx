import { Star } from "lucide-react";
import { formatInr, toPaise } from "@/lib/money";

export function Money({ value, className }: { value: string | number; className?: string }) {
  const paise = typeof value === "number" ? value : toPaise(value);
  return <span className={className}>{formatInr(paise)}</span>;
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const rounded = Math.round(rating);
  return (
    <p className="flex items-center gap-1 text-sm text-muted-foreground" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      <span className="flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className={`h-3.5 w-3.5 ${index < rounded ? "fill-current text-foreground" : ""}`} />
        ))}
      </span>
      <span>{rating.toFixed(1)}</span>
      {count != null ? <span>({count})</span> : null}
    </p>
  );
}
