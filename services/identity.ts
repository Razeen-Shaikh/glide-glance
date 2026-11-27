import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { sendEmail } from "@/lib/email";
import type { z } from "zod";
import { registerSchema, resetPasswordSchema } from "@/validations";

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "EMAIL_IN_USE", "An account with this email already exists.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash, role: "CUSTOMER" },
    select: { id: true, email: true, name: true },
  });
}

export async function requestPasswordReset(email: string) {
  const normalized = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user?.passwordHash || !user.isActive) return;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
  await prisma.verificationToken.create({ data: { identifier: normalized, token, expires } });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/reset-password?token=${token}&email=${encodeURIComponent(normalized)}`;
  await sendEmail(
    normalized,
    "Reset your Glide Glance password",
    `<p>Use this link within one hour to choose a new password.</p><p><a href="${url}">${url}</a></p>`,
  );
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const email = input.email.toLowerCase();
  const record = await prisma.verificationToken.findUnique({ where: { token: input.token } });
  if (!record || record.identifier !== email || record.expires < new Date()) {
    throw new ApiError(400, "INVALID_TOKEN", "This reset link is invalid or has expired.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token: input.token } }),
  ]);
}
