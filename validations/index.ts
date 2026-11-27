import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(160),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72)
    .regex(/[A-Za-z]/, "Include a letter.")
    .regex(/\d/, "Include a number."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password.").max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().min(20),
  password: registerSchema.shape.password,
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient name.").max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  postalCode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code."),
  country: z.literal("IN").default("IN"),
  isDefault: z.boolean().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
});

export const checkoutSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email."),
    shipping: addressSchema,
    billingSame: z.boolean().default(true),
    billing: addressSchema.optional(),
    deliveryOption: z.enum(["STANDARD", "EXPRESS"]),
    paymentMethod: z.enum(["RAZORPAY", "COD"]),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
    saveAddress: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.billingSame && !value.billing) {
      ctx.addIssue({ code: "custom", path: ["billing"], message: "Add a billing address." });
    }
  });

export const cartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10),
});

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(10),
});

export const couponCodeSchema = z.object({
  code: z.string().trim().min(2).max(40),
});

export const wishlistSchema = z.object({
  productId: z.string().min(1),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Write at least 10 characters.").max(2000),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export const returnSchema = z.object({
  reason: z.string().trim().min(10).max(500),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(6).max(40),
  email: z.string().trim().email(),
});

const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount.");

export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(80),
  price: z.string().optional().or(z.literal("")),
  stock: z.coerce.number().int().min(0).max(100000),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000).default(5),
  attributes: z
    .array(z.object({ name: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(40) }))
    .default([]),
});

export const productWriteSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  description: z.string().trim().min(10).max(8000),
  specifications: z.array(z.object({ name: z.string().trim().min(1), value: z.string().trim().min(1) })).default([]),
  price: moneyString,
  compareAtPrice: moneyString.optional().or(z.literal("")),
  gstRate: z.coerce.number().refine((value) => [0, 5, 12, 18, 28].includes(value), "Choose a GST rate."),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isSpecialOffer: z.boolean().default(false),
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  images: z
    .array(z.object({ url: z.string().min(1), publicId: z.string().nullable().optional(), alt: z.string().optional() }))
    .min(1, "Add at least one image."),
  variants: z.array(variantInputSchema).min(1, "Add at least one variant."),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
});

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  type: z.enum(["PERCENT", "FIXED"]),
  value: moneyString,
  minOrderAmount: moneyString.default("0"),
  maxDiscountAmount: moneyString.optional().or(z.literal("")),
  usageLimit: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  usageLimitPerUser: z.coerce.number().int().positive().default(1),
  startsAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const inventoryAdjustSchema = z.object({
  variantId: z.string().min(1),
  delta: z.coerce.number().int().min(-100000).max(100000).refine((value) => value !== 0, "Enter a quantity change."),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "RETURNED",
  ]),
  carrier: z.string().trim().max(80).optional().or(z.literal("")),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const returnDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const customerStatusSchema = z.object({
  isActive: z.boolean(),
});

export const productQuerySchema = z.object({
  q: z.string().trim().max(80).optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  brand: z.string().optional().or(z.literal("")),
  minPrice: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  maxPrice: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  rating: z.preprocess(emptyToUndefined, z.coerce.number().min(1).max(5).optional()),
  availability: z.enum(["in_stock", "out_of_stock"]).optional().or(z.literal("")),
  sort: z.enum(["price_asc", "price_desc", "newest", "popularity"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  ids: z.string().optional(),
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ProductWriteInput = z.infer<typeof productWriteSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
