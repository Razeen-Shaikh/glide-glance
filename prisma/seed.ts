import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const catalog = [
  {
    name: "Merino Crew",
    slug: "merino-crew",
    description: "A fine-gauge merino crew that sits clean under a jacket and holds its shape after travel.",
    price: "4299.00",
    compareAt: "4999.00",
    gst: 5,
    category: "apparel",
    brand: "northline",
    flags: { isFeatured: true, isBestSeller: true },
    specs: { Material: "100% merino wool", Weight: "180 gsm", Care: "Cold hand wash" },
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["NL-CREW-IV-S", "Ivory / S", "Ivory", "S", 12],
      ["NL-CREW-IV-M", "Ivory / M", "Ivory", "M", 18],
      ["NL-CREW-INK-M", "Ink / M", "Ink", "M", 9],
    ],
  },
  {
    name: "Linen Overshirt",
    slug: "linen-overshirt",
    description: "Washed European linen with a soft collar, cut to wear open over a tee or buttoned on its own.",
    price: "3890.00",
    compareAt: null,
    gst: 5,
    category: "apparel",
    brand: "atelier-mira",
    flags: { isNewArrival: true, isTrending: true },
    specs: { Material: "100% linen", Origin: "India", Care: "Machine wash cold" },
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["AM-LINEN-S", "Sand / S", "Sand", "S", 8],
      ["AM-LINEN-M", "Sand / M", "Sand", "M", 14],
      ["AM-LINEN-L", "Sand / L", "Sand", "L", 6],
    ],
  },
  {
    name: "Everyday Chino",
    slug: "everyday-chino",
    description: "A mid-rise cotton chino with a little stretch and a hem that works with sneakers or loafers.",
    price: "3290.00",
    compareAt: "3690.00",
    gst: 5,
    category: "apparel",
    brand: "field-form",
    flags: { isSpecialOffer: true, isBestSeller: true },
    specs: { Material: "98% cotton, 2% elastane", Fit: "Straight" },
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["FF-CHINO-30", "Stone / 30", "Stone", "30", 10],
      ["FF-CHINO-32", "Stone / 32", "Stone", "32", 16],
      ["FF-CHINO-34", "Stone / 34", "Stone", "34", 7],
    ],
  },
  {
    name: "Court Sneaker",
    slug: "court-sneaker",
    description: "Leather court sneaker with a cupsole and a padded collar. Built for daily miles, not a single season.",
    price: "6490.00",
    compareAt: null,
    gst: 18,
    category: "footwear",
    brand: "northline",
    flags: { isFeatured: true, isTrending: true },
    specs: { Upper: "Full-grain leather", Sole: "Rubber cupsole" },
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["NL-COURT-8", "White / 8", "White", "8", 6],
      ["NL-COURT-9", "White / 9", "White", "9", 11],
      ["NL-COURT-10", "White / 10", "White", "10", 4],
    ],
  },
  {
    name: "Leather Loafer",
    slug: "leather-loafer",
    description: "An unlined loafer in vegetable-tanned leather that darkens honestly with wear.",
    price: "7990.00",
    compareAt: "8990.00",
    gst: 18,
    category: "footwear",
    brand: "atelier-mira",
    flags: { isSpecialOffer: true },
    specs: { Leather: "Vegetable tanned", Construction: "Blake stitch" },
    image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["AM-LOAF-8", "Tan / 8", "Tan", "8", 5],
      ["AM-LOAF-9", "Tan / 9", "Tan", "9", 8],
    ],
  },
  {
    name: "Stoneware Pourer",
    slug: "stoneware-pourer",
    description: "A 600 ml pourer with a pulled spout. The glaze breaks warm where the clay shows through.",
    price: "1890.00",
    compareAt: null,
    gst: 12,
    category: "home",
    brand: "kora-studio",
    flags: { isFeatured: true, isNewArrival: true },
    specs: { Volume: "600 ml", Material: "Stoneware", Care: "Dishwasher safe" },
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80",
    variants: [["KS-POUR-1", "Speckled", "Speckled", "One", 20]],
  },
  {
    name: "Brass Task Lamp",
    slug: "brass-task-lamp",
    description: "A weighted brass lamp with a linen shade. The arm holds a position without a visible joint.",
    price: "8490.00",
    compareAt: null,
    gst: 18,
    category: "home",
    brand: "kora-studio",
    flags: { isTrending: true },
    specs: { Height: "48 cm", Bulb: "E27, not included", Finish: "Unlacquered brass" },
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
    variants: [["KS-LAMP-1", "Brass", "Brass", "One", 7]],
  },
  {
    name: "Wool Throw",
    slug: "wool-throw",
    description: "A heavy wool throw with a finished edge. It is meant to live on a sofa, not in a cupboard.",
    price: "4590.00",
    compareAt: "5290.00",
    gst: 12,
    category: "home",
    brand: "field-form",
    flags: { isSpecialOffer: true, isBestSeller: true },
    specs: { Size: "140 × 200 cm", Material: "Lambswool" },
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    variants: [["FF-THROW-1", "Oat", "Oat", "One", 15]],
  },
  {
    name: "Canvas Weekender",
    slug: "canvas-weekender",
    description: "Waxed canvas with a leather base and a strap that sits on the shoulder rather than the neck.",
    price: "6990.00",
    compareAt: null,
    gst: 18,
    category: "accessories",
    brand: "field-form",
    flags: { isFeatured: true, isNewArrival: true },
    specs: { Volume: "35 L", Material: "Waxed canvas and leather" },
    image: "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["FF-WEEK-OL", "Olive", "Olive", "One", 9],
      ["FF-WEEK-IN", "Ink", "Ink", "One", 4],
    ],
  },
  {
    name: "Field Watch",
    slug: "field-watch",
    description: "A 38 mm steel field watch with a matte dial and a strap you can change without a tool.",
    price: "12490.00",
    compareAt: null,
    gst: 18,
    category: "accessories",
    brand: "northline",
    flags: { isTrending: true, isBestSeller: true },
    specs: { Case: "38 mm steel", Movement: "Quartz", Water: "5 ATM" },
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1200&q=80",
    variants: [["NL-WATCH-1", "Steel", "Steel", "One", 6]],
  },
  {
    name: "Oak Side Table",
    slug: "oak-side-table",
    description: "A three-leg side table in solid oak. The top is oiled, not coated, so it can be refreshed.",
    price: "9890.00",
    compareAt: null,
    gst: 18,
    category: "home",
    brand: "kora-studio",
    flags: { isNewArrival: true },
    specs: { Top: "40 cm", Height: "48 cm", Timber: "Solid oak" },
    image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=80",
    variants: [["KS-TABLE-1", "Oak", "Oak", "One", 3]],
  },
  {
    name: "Silk Scarf",
    slug: "silk-scarf",
    description: "A small silk scarf with a hand-drawn stripe. It folds into a pocket without bulk.",
    price: "2190.00",
    compareAt: "2590.00",
    gst: 5,
    category: "accessories",
    brand: "atelier-mira",
    flags: { isSpecialOffer: true, isTrending: true },
    specs: { Size: "55 × 55 cm", Material: "Silk twill" },
    image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1200&q=80",
    variants: [
      ["AM-SCARF-RS", "Rust", "Rust", "One", 13],
      ["AM-SCARF-NV", "Navy", "Navy", "One", 2],
    ],
  },
] as const;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? "customer@glideglance.test";
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  if (!adminEmail || !adminPassword || !customerPassword) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_PASSWORD, and SEED_CUSTOMER_PASSWORD before seeding.");
  }

  await prisma.inventoryTransaction.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const categories = {
    apparel: await prisma.category.create({ data: { name: "Apparel", slug: "apparel", description: "Knitwear, shirts, and trousers." } }),
    footwear: await prisma.category.create({ data: { name: "Footwear", slug: "footwear", description: "Shoes for the week and the weekend." } }),
    home: await prisma.category.create({ data: { name: "Home", slug: "home", description: "Objects for the table and the room." } }),
    accessories: await prisma.category.create({ data: { name: "Accessories", slug: "accessories", description: "Bags, watches, and scarves." } }),
  };
  const brands = {
    northline: await prisma.brand.create({ data: { name: "Northline", slug: "northline" } }),
    "atelier-mira": await prisma.brand.create({ data: { name: "Atelier Mira", slug: "atelier-mira" } }),
    "field-form": await prisma.brand.create({ data: { name: "Field & Form", slug: "field-form" } }),
    "kora-studio": await prisma.brand.create({ data: { name: "Kora Studio", slug: "kora-studio" } }),
  };

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const customerHash = await bcrypt.hash(customerPassword, 12);
  await prisma.user.create({
    data: { name: "Store Admin", email: adminEmail.toLowerCase(), passwordHash: adminHash, role: "ADMIN", emailVerified: new Date() },
  });
  const customer = await prisma.user.create({
    data: {
      name: "Asha Menon",
      email: customerEmail.toLowerCase(),
      passwordHash: customerHash,
      role: "CUSTOMER",
      phone: "9845012345",
      emailVerified: new Date(),
      addresses: {
        create: {
          fullName: "Asha Menon",
          phone: "9845012345",
          line1: "18 Langford Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560025",
          isDefault: true,
        },
      },
    },
  });

  for (const item of catalog) {
    const category = categories[item.category];
    const brand = brands[item.brand];
    await prisma.product.create({
      data: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        specifications: item.specs,
        price: item.price,
        compareAtPrice: item.compareAt,
        gstRate: item.gst,
        status: "PUBLISHED",
        salesCount: "isBestSeller" in item.flags ? 24 : 6,
        ratingAverage: 4.6,
        ratingCount: 1,
        ...item.flags,
        categoryId: category.id,
        brandId: brand.id,
        images: { create: [{ url: item.image, alt: item.name, position: 0 }] },
        variants: {
          create: item.variants.map(([sku, name, color, size, stock]) => ({
            sku,
            name,
            attributes: {
              create: [
                { name: "Color", value: color },
                { name: "Size", value: size },
              ],
            },
            inventory: {
              create: { quantityOnHand: stock, quantityAvailable: stock, lowStockThreshold: 5 },
            },
          })),
        },
        reviews: {
          create: {
            userId: customer.id,
            rating: 5,
            title: "Worth keeping",
            body: "The material feels considered and the fit matched the description.",
            verifiedPurchase: true,
          },
        },
      },
    });
  }

  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        type: "PERCENT",
        value: "10",
        minOrderAmount: "999",
        maxDiscountAmount: "500",
        usageLimit: 100,
        usageLimitPerUser: 1,
        startsAt: new Date("2026-01-01"),
        expiresAt: new Date("2027-01-01"),
      },
      {
        code: "FLAT200",
        type: "FIXED",
        value: "200",
        minOrderAmount: "1500",
        usageLimit: 100,
        usageLimitPerUser: 1,
        startsAt: new Date("2026-01-01"),
        expiresAt: new Date("2027-01-01"),
      },
    ],
  });

  const crew = await prisma.product.findUnique({ where: { slug: "merino-crew" }, include: { variants: true } });
  const lamp = await prisma.product.findUnique({ where: { slug: "brass-task-lamp" }, include: { variants: true } });
  if (crew?.variants[0] && lamp?.variants[0]) {
    const orders: Prisma.OrderCreateInput[] = [
      orderInput(customer.id, customer.email, "GG261101DEMO01", "DELIVERED", -18, crew, 1),
      orderInput(customer.id, customer.email, "GG261110DEMO02", "SHIPPED", -8, lamp, 1),
      orderInput(customer.id, customer.email, "GG261120DEMO03", "PROCESSING", -2, crew, 1),
    ];
    for (const data of orders) {
      await prisma.order.create({ data });
    }
  }

  console.log(`Seeded catalog. Admin ${adminEmail}. Customer ${customerEmail}.`);
}

function orderInput(
  userId: string,
  email: string,
  orderNumber: string,
  status: "DELIVERED" | "SHIPPED" | "PROCESSING",
  daysAgo: number,
  product: { id: string; name: string; price: { toString(): string }; variants: { id: string; sku: string }[] },
  quantity: number,
): Prisma.OrderCreateInput {
  const createdAt = new Date(Date.now() + daysAgo * 24 * 60 * 60 * 1000);
  const variant = product.variants[0];
  const unit = Number(product.price.toString());
  const total = (unit * quantity).toFixed(2);
  return {
    orderNumber,
    user: { connect: { id: userId } },
    email,
    status,
    subtotal: total,
    shippingTotal: "0.00",
    taxTotal: "0.00",
    grandTotal: total,
    shippingAddress: {
      fullName: "Asha Menon",
      phone: "9845012345",
      line1: "18 Langford Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560025",
      country: "IN",
    },
    billingAddress: {
      fullName: "Asha Menon",
      phone: "9845012345",
      line1: "18 Langford Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560025",
      country: "IN",
    },
    createdAt,
    items: {
      create: {
        variant: { connect: { id: variant.id } },
        productId: product.id,
        productName: product.name,
        sku: variant.sku,
        quantity,
        unitPrice: product.price.toString(),
        gstRate: 5,
      },
    },
    payment: { create: { method: "COD", status: status === "DELIVERED" ? "CAPTURED" : "PENDING", amount: total } },
    shipment:
      status === "PROCESSING"
        ? undefined
        : {
            create: {
              carrier: "Delhivery",
              trackingNumber: `TRK${orderNumber.slice(-4)}`,
              shippedAt: createdAt,
              deliveredAt: status === "DELIVERED" ? createdAt : null,
            },
          },
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
