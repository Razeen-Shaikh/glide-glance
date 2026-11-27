import "server-only";
import { Prisma, type InventoryReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

type Tx = Prisma.TransactionClient;

export async function lockInventories(tx: Tx, variantIds: string[]) {
  if (variantIds.length === 0) return;
  await tx.$queryRaw`SELECT "id" FROM "Inventory" WHERE "variantId" IN (${Prisma.join(variantIds)}) FOR UPDATE`;
}

function assertNonNegative(value: number, label: string) {
  if (value < 0) throw new ApiError(409, "STOCK", `${label} does not have enough stock.`);
}

export async function reserveStock(tx: Tx, inventoryId: string, quantity: number, orderId: string, label: string) {
  const inventory = await tx.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory || inventory.quantityAvailable < quantity) {
    throw new ApiError(409, "STOCK", `${label} does not have enough stock.`);
  }
  const quantityReserved = inventory.quantityReserved + quantity;
  const quantityAvailable = inventory.quantityOnHand - quantityReserved;
  assertNonNegative(quantityAvailable, label);
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { quantityReserved, quantityAvailable },
  });
  await writeLedger(tx, inventory.id, "SALE", -quantity, orderId, "Reserved for online payment");
}

export async function deductStock(tx: Tx, inventoryId: string, quantity: number, orderId: string, label: string, note: string) {
  const inventory = await tx.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory || inventory.quantityAvailable < quantity) {
    throw new ApiError(409, "STOCK", `${label} does not have enough stock.`);
  }
  const quantityOnHand = inventory.quantityOnHand - quantity;
  const quantityAvailable = quantityOnHand - inventory.quantityReserved;
  assertNonNegative(quantityOnHand, label);
  assertNonNegative(quantityAvailable, label);
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { quantityOnHand, quantityAvailable },
  });
  await writeLedger(tx, inventory.id, "SALE", -quantity, orderId, note);
}

export async function captureReserved(tx: Tx, inventoryId: string, quantity: number, label: string) {
  const inventory = await tx.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory || inventory.quantityReserved < quantity || inventory.quantityOnHand < quantity) {
    throw new ApiError(409, "STOCK", `${label} could not be captured.`);
  }
  const quantityOnHand = inventory.quantityOnHand - quantity;
  const quantityReserved = inventory.quantityReserved - quantity;
  const quantityAvailable = quantityOnHand - quantityReserved;
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { quantityOnHand, quantityReserved, quantityAvailable },
  });
}

export async function releaseReserved(tx: Tx, inventoryId: string, quantity: number, orderId: string) {
  const inventory = await tx.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory) return;
  const quantityReserved = Math.max(0, inventory.quantityReserved - quantity);
  const quantityAvailable = inventory.quantityOnHand - quantityReserved;
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { quantityReserved, quantityAvailable },
  });
  await writeLedger(tx, inventory.id, "RELEASE", quantity, orderId, "Payment hold released");
}

export async function restock(tx: Tx, inventoryId: string, quantity: number, orderId: string, reason: InventoryReason, note: string) {
  const inventory = await tx.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory) return;
  const quantityOnHand = inventory.quantityOnHand + quantity;
  const quantityAvailable = quantityOnHand - inventory.quantityReserved;
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { quantityOnHand, quantityAvailable },
  });
  await writeLedger(tx, inventory.id, reason, quantity, orderId, note);
}

async function writeLedger(
  tx: Tx,
  inventoryId: string,
  reason: InventoryReason,
  quantity: number,
  orderId: string | null,
  note: string,
) {
  await tx.inventoryTransaction.create({
    data: { inventoryId, reason, quantity, orderId, note },
  });
}

export async function adjustStock(variantId: string, delta: number, note: string) {
  return prisma.$transaction(async (tx) => {
    await lockInventories(tx, [variantId]);
    const inventory = await tx.inventory.findUnique({ where: { variantId } });
    if (!inventory) throw new ApiError(404, "NOT_FOUND", "Inventory record not found.");
    const quantityOnHand = inventory.quantityOnHand + delta;
    const quantityAvailable = quantityOnHand - inventory.quantityReserved;
    if (quantityOnHand < 0 || quantityAvailable < 0) {
      throw new ApiError(409, "STOCK", "That adjustment would make stock negative.");
    }
    await tx.inventory.update({
      where: { id: inventory.id },
      data: { quantityOnHand, quantityAvailable },
    });
    await writeLedger(tx, inventory.id, "ADJUSTMENT", delta, null, note || "Manual adjustment");
    return tx.inventory.findUnique({ where: { id: inventory.id } });
  });
}
