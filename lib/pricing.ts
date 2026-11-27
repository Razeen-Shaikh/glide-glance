import { toPaise } from "@/lib/money";

export const FREE_SHIPPING_THRESHOLD_PAISE = 99900;
export const STANDARD_SHIPPING_PAISE = 4900;
export const EXPRESS_SHIPPING_PAISE = 9900;

export type DeliveryOption = "STANDARD" | "EXPRESS";

export type PricedLine = {
  unitPricePaise: number;
  quantity: number;
  gstRate: number;
};

export type CouponQuoteInput = {
  type: "PERCENT" | "FIXED";
  value: number | string;
  minOrderAmount: number | string;
  maxDiscountAmount: number | string | null;
};

export type PriceQuote = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  grandPaise: number;
  couponMessage: string | null;
};

export function lineTotalPaise(line: PricedLine): number {
  return line.unitPricePaise * line.quantity;
}

export function shippingPaise(option: DeliveryOption, merchandiseAfterDiscount: number): number {
  if (option === "EXPRESS") return EXPRESS_SHIPPING_PAISE;
  if (merchandiseAfterDiscount >= FREE_SHIPPING_THRESHOLD_PAISE) return 0;
  return STANDARD_SHIPPING_PAISE;
}

/** GST extracted from a tax-inclusive amount. Rate is a percent such as 18. */
export function taxOnInclusive(amountPaise: number, gstRate: number): number {
  if (amountPaise <= 0 || gstRate <= 0) return 0;
  return Math.round((amountPaise * gstRate) / (100 + gstRate));
}

export function couponDiscountPaise(
  subtotalPaise: number,
  coupon: CouponQuoteInput | null,
): { discountPaise: number; message: string | null } {
  if (!coupon) return { discountPaise: 0, message: null };
  const min = toPaise(coupon.minOrderAmount);
  if (subtotalPaise < min) {
    return {
      discountPaise: 0,
      message: `Add more to reach the minimum of ₹${(min / 100).toFixed(0)} for this coupon.`,
    };
  }
  if (coupon.type === "PERCENT") {
    const percent = Number(coupon.value);
    let discount = Math.round((subtotalPaise * percent) / 100);
    if (coupon.maxDiscountAmount != null) {
      discount = Math.min(discount, toPaise(coupon.maxDiscountAmount));
    }
    discount = Math.min(discount, subtotalPaise);
    return { discountPaise: discount, message: null };
  }
  const discount = Math.min(toPaise(coupon.value), subtotalPaise);
  return { discountPaise: discount, message: null };
}

export function quoteOrder(
  lines: PricedLine[],
  coupon: CouponQuoteInput | null,
  delivery: DeliveryOption,
): PriceQuote {
  const subtotalPaise = lines.reduce((sum, line) => sum + lineTotalPaise(line), 0);
  const { discountPaise, message } = couponDiscountPaise(subtotalPaise, coupon);
  const shipping = shippingPaise(delivery, subtotalPaise - discountPaise);

  let taxPaise = 0;
  if (subtotalPaise === 0) {
    return {
      subtotalPaise: 0,
      discountPaise: 0,
      shippingPaise: shipping,
      taxPaise: 0,
      grandPaise: shipping,
      couponMessage: message,
    };
  }

  let remainingDiscount = discountPaise;
  lines.forEach((line, index) => {
    const total = lineTotalPaise(line);
    const share =
      index === lines.length - 1
        ? remainingDiscount
        : Math.round((discountPaise * total) / subtotalPaise);
    remainingDiscount -= share;
    const discounted = Math.max(0, total - share);
    taxPaise += taxOnInclusive(discounted, line.gstRate);
  });

  return {
    subtotalPaise,
    discountPaise,
    shippingPaise: shipping,
    taxPaise,
    grandPaise: subtotalPaise - discountPaise + shipping,
    couponMessage: message,
  };
}
