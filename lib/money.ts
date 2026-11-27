/** Integer paise helpers. Persisted money is Decimal; Razorpay receives paise. */

export function toPaise(value: string | number | { toString(): string }): number {
  const raw = String(value).trim();
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const frac = `${fraction}00`.slice(0, 2);
  const paise = Number(whole) * 100 + Number(frac);
  if (!Number.isFinite(paise)) {
    throw new Error(`Invalid money value: ${raw}`);
  }
  return negative ? -paise : paise;
}

export function paiseToDecimalString(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${negative ? "-" : ""}${rupees}.${rem.toString().padStart(2, "0")}`;
}

export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function discountPercent(pricePaise: number, compareAtPaise: number | null): number | null {
  if (!compareAtPaise || compareAtPaise <= pricePaise) return null;
  return Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
}
