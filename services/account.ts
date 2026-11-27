import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { addressSchema, profileSchema } from "@/validations";

export async function updateProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  return prisma.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone || null },
    select: { id: true, name: true, email: true, phone: true },
  });
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
}

export async function createAddress(userId: string, input: unknown) {
  const data = addressSchema.parse(input);
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.create({
    data: {
      userId,
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: "IN",
      isDefault: Boolean(data.isDefault),
    },
  });
}

export async function updateAddress(userId: string, id: string, input: unknown) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Address not found.");
  const data = addressSchema.parse(input);
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.update({
    where: { id },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      isDefault: Boolean(data.isDefault),
    },
  });
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Address not found.");
  await prisma.address.delete({ where: { id } });
}

export async function subscribeNewsletter(email: string) {
  await prisma.newsletterSubscription.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase() },
    update: {},
  });
  return { subscribed: true };
}
