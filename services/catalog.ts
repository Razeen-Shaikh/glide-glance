import "server-only";
import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { serializeCard } from "@/lib/serialize";
import { toPaise } from "@/lib/money";
import { productQuerySchema, productWriteSchema, categorySchema, brandSchema } from "@/validations";
import { slugify } from "@/lib/utils";

const cardInclude = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { position: "asc" as const }, take: 1 },
  variants: {
    where: { isActive: true },
    select: { inventory: { select: { quantityAvailable: true } } },
  },
} satisfies Prisma.ProductInclude;

function first(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listProducts(params: URLSearchParams) {
  const parsed = productQuerySchema.parse({
    q: first(params.get("q")),
    category: first(params.get("category")),
    brand: first(params.get("brand")),
    minPrice: first(params.get("minPrice")),
    maxPrice: first(params.get("maxPrice")),
    rating: first(params.get("rating")),
    availability: first(params.get("availability")),
    sort: first(params.get("sort")) ?? "newest",
    page: first(params.get("page")) ?? "1",
    limit: first(params.get("limit")) ?? "12",
    ids: first(params.get("ids")),
  });

  const where: Prisma.ProductWhereInput = { status: "PUBLISHED" };
  if (parsed.ids) {
    const ids = parsed.ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 12);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      include: cardInclude,
    });
    const order = new Map(ids.map((id, index) => [id, index]));
    products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { items: products.map(serializeCard), total: products.length, page: 1, pages: 1 };
  }
  if (parsed.q) {
    where.OR = [
      { name: { contains: parsed.q, mode: "insensitive" } },
      { description: { contains: parsed.q, mode: "insensitive" } },
    ];
  }
  if (parsed.category) where.category = { slug: parsed.category };
  if (parsed.brand) where.brand = { slug: parsed.brand };
  if (parsed.minPrice != null || parsed.maxPrice != null) {
    where.price = {};
    if (parsed.minPrice != null) where.price.gte = parsed.minPrice;
    if (parsed.maxPrice != null) where.price.lte = parsed.maxPrice;
  }
  if (parsed.rating) where.ratingAverage = { gte: parsed.rating };
  if (parsed.availability === "in_stock") {
    where.variants = { some: { isActive: true, inventory: { quantityAvailable: { gt: 0 } } } };
  }
  if (parsed.availability === "out_of_stock") {
    where.variants = { every: { inventory: { quantityAvailable: { lte: 0 } } } };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    parsed.sort === "price_asc"
      ? { price: "asc" }
      : parsed.sort === "price_desc"
        ? { price: "desc" }
        : parsed.sort === "popularity"
          ? { salesCount: "desc" }
          : { createdAt: "desc" };

  const [items, total, categories, brands] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (parsed.page - 1) * parsed.limit,
      take: parsed.limit,
      include: cardInclude,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
  ]);

  return {
    items: items.map(serializeCard),
    total,
    page: parsed.page,
    pages: Math.max(1, Math.ceil(total / parsed.limit)),
    categories,
    brands,
  };
}

export async function getHomeCatalog() {
  const published = { status: "PUBLISHED" as const };
  const [featured, trending, bestSellers, newArrivals, offers, categories] = await Promise.all([
    prisma.product.findMany({ where: { ...published, isFeatured: true }, include: cardInclude, take: 8 }),
    prisma.product.findMany({ where: { ...published, isTrending: true }, include: cardInclude, take: 8 }),
    prisma.product.findMany({
      where: { ...published, isBestSeller: true },
      include: cardInclude,
      orderBy: { salesCount: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { ...published, isNewArrival: true },
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({ where: { ...published, isSpecialOffer: true }, include: cardInclude, take: 8 }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        products: { where: published, include: cardInclude, take: 4, orderBy: { salesCount: "desc" } },
      },
    }),
  ]);
  return {
    featured: featured.map(serializeCard),
    trending: trending.map(serializeCard),
    bestSellers: bestSellers.map(serializeCard),
    newArrivals: newArrivals.map(serializeCard),
    offers: offers.map(serializeCard),
    categories: categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      description: category.description,
      products: category.products.map(serializeCard),
    })),
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: {
        where: { isActive: true },
        include: { attributes: true, inventory: true },
        orderBy: { sku: "asc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const related = await prisma.product.findMany({
    where: { status: "PUBLISHED", categoryId: product.categoryId, id: { not: product.id } },
    include: cardInclude,
    take: 4,
  });
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    specifications: (product.specifications ?? {}) as Record<string, string>,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    gstRate: Number(product.gstRate.toString()),
    ratingAverage: Number(product.ratingAverage.toString()),
    ratingCount: product.ratingCount,
    brand: product.brand.name,
    brandSlug: product.brand.slug,
    category: product.category.name,
    categorySlug: product.category.slug,
    images: product.images.map((image) => ({ url: image.url, alt: image.alt ?? product.name })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: (variant.price ?? product.price).toString(),
      available: variant.inventory?.quantityAvailable ?? 0,
      attributes: variant.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value })),
    })),
    reviews: product.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
      verifiedPurchase: review.verifiedPurchase,
      author: review.user.name ?? "Customer",
      createdAt: review.createdAt.toISOString(),
    })),
    related: related.map(serializeCard),
  };
}

export async function getFilterOptions() {
  const [categories, brands, price] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, parentId: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.product.aggregate({ where: { status: "PUBLISHED" }, _min: { price: true }, _max: { price: true } }),
  ]);
  return {
    categories,
    brands,
    minPrice: price._min.price ? toPaise(price._min.price) / 100 : 0,
    maxPrice: price._max.price ? toPaise(price._max.price) / 100 : 0,
  };
}

function specsToJson(specs: { name: string; value: string }[]) {
  return Object.fromEntries(specs.map((spec) => [spec.name, spec.value]));
}

export async function createProduct(input: unknown) {
  const data = productWriteSchema.parse(input);
  await assertCatalogRefs(data.categoryId, data.brandId);
  return prisma.product.create({
    data: productData(data),
    include: { images: true, variants: { include: { inventory: true, attributes: true } } },
  });
}

export async function updateProduct(id: string, input: unknown) {
  const data = productWriteSchema.parse(input);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: { include: { orderItems: { select: { id: true } } } } },
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  await assertCatalogRefs(data.categoryId, data.brandId);
  const keptIds = new Set(data.variants.map((variant) => variant.id).filter(Boolean));
  return prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        specifications: specsToJson(data.specifications),
        price: data.price,
        compareAtPrice: data.compareAtPrice ? data.compareAtPrice : null,
        gstRate: data.gstRate,
        status: data.status,
        isFeatured: data.isFeatured,
        isTrending: data.isTrending,
        isBestSeller: data.isBestSeller,
        isNewArrival: data.isNewArrival,
        isSpecialOffer: data.isSpecialOffer,
        categoryId: data.categoryId,
        brandId: data.brandId,
      },
    });
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.productImage.createMany({
      data: data.images.map((image, position) => ({
        productId: id,
        url: image.url,
        publicId: image.publicId ?? null,
        alt: image.alt || data.name,
        position,
      })),
    });
    for (const variant of existing.variants) {
      if (keptIds.has(variant.id)) continue;
      if (variant.orderItems.length > 0) {
        await tx.productVariant.update({ where: { id: variant.id }, data: { isActive: false } });
      } else {
        await tx.productVariant.delete({ where: { id: variant.id } });
      }
    }
    for (const variant of data.variants) {
      if (variant.id) {
        await tx.productAttribute.deleteMany({ where: { variantId: variant.id } });
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            sku: variant.sku,
            name: variant.name,
            price: variant.price ? variant.price : null,
            isActive: true,
            attributes: { create: variant.attributes },
          },
        });
        const currentInventory = await tx.inventory.findUnique({ where: { variantId: variant.id } });
        const quantityReserved = currentInventory?.quantityReserved ?? 0;
        if (variant.stock < quantityReserved) {
          throw new ApiError(409, "STOCK", "On-hand stock cannot drop below the reserved quantity.");
        }
        await tx.inventory.update({
          where: { variantId: variant.id },
          data: {
            quantityOnHand: variant.stock,
            quantityAvailable: variant.stock - quantityReserved,
            lowStockThreshold: variant.lowStockThreshold,
          },
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId: id,
            sku: variant.sku,
            name: variant.name,
            price: variant.price ? variant.price : null,
            attributes: { create: variant.attributes },
            inventory: {
              create: {
                quantityOnHand: variant.stock,
                quantityAvailable: variant.stock,
                lowStockThreshold: variant.lowStockThreshold,
              },
            },
          },
        });
      }
    }
    return tx.product.findUnique({
      where: { id },
      include: { images: true, variants: { include: { attributes: true, inventory: true } }, brand: true, category: true },
    });
  });
}

function productData(data: ReturnType<typeof productWriteSchema.parse>): Prisma.ProductCreateInput {
  return {
    name: data.name,
    slug: data.slug || slugify(data.name),
    description: data.description,
    specifications: specsToJson(data.specifications),
    price: data.price,
    compareAtPrice: data.compareAtPrice ? data.compareAtPrice : null,
    gstRate: data.gstRate,
    status: data.status as ProductStatus,
    isFeatured: data.isFeatured,
    isTrending: data.isTrending,
    isBestSeller: data.isBestSeller,
    isNewArrival: data.isNewArrival,
    isSpecialOffer: data.isSpecialOffer,
    category: { connect: { id: data.categoryId } },
    brand: { connect: { id: data.brandId } },
    images: {
      create: data.images.map((image, position) => ({
        url: image.url,
        publicId: image.publicId ?? null,
        alt: image.alt || data.name,
        position,
      })),
    },
    variants: {
      create: data.variants.map((variant) => ({
        sku: variant.sku,
        name: variant.name,
        price: variant.price ? variant.price : null,
        attributes: { create: variant.attributes },
        inventory: {
          create: {
            quantityOnHand: variant.stock,
            quantityAvailable: variant.stock,
            lowStockThreshold: variant.lowStockThreshold,
          },
        },
      })),
    },
  };
}

async function assertCatalogRefs(categoryId: string, brandId: string) {
  const [category, brand] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.brand.findUnique({ where: { id: brandId } }),
  ]);
  if (!category || !brand) throw new ApiError(400, "CATALOG", "Choose a valid category and brand.");
}

export async function archiveOrDeleteProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: { include: { orderItems: { select: { id: true } } } } },
  });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const referenced = product.variants.some((variant) => variant.orderItems.length > 0);
  if (referenced || product.status === "PUBLISHED") {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    return { archived: true };
  }
  await prisma.product.delete({ where: { id } });
  return { archived: false };
}

export async function adminListProducts() {
  return prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      brand: true,
      category: true,
      images: { take: 1, orderBy: { position: "asc" } },
      variants: { include: { inventory: true, attributes: true } },
    },
  });
}

export async function adminGetProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { include: { attributes: true, inventory: true } },
      brand: true,
      category: true,
    },
  });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  return product;
}

export async function saveCategory(input: unknown, id?: string) {
  const data = categorySchema.parse(input);
  const payload = {
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    parentId: data.parentId || null,
  };
  if (id) return prisma.category.update({ where: { id }, data: payload });
  return prisma.category.create({ data: payload });
}

export async function deleteCategory(id: string) {
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw new ApiError(409, "IN_USE", "Move products out of this category before deleting it.");
  await prisma.category.delete({ where: { id } });
}

export async function saveBrand(input: unknown, id?: string) {
  const data = brandSchema.parse(input);
  if (id) return prisma.brand.update({ where: { id }, data });
  return prisma.brand.create({ data });
}

export async function deleteBrand(id: string) {
  const count = await prisma.product.count({ where: { brandId: id } });
  if (count > 0) throw new ApiError(409, "IN_USE", "Move products off this brand before deleting it.");
  await prisma.brand.delete({ where: { id } });
}
