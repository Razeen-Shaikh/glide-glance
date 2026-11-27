import { expect, test } from "@playwright/test";

test("browses the catalog and adds a product to the cart", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Objects with a longer life." })).toBeVisible();
  await page.getByRole("link", { name: "Shop the edit" }).click();
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  await page.getByRole("link", { name: "Merino Crew" }).first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("Merino Crew")).toBeVisible();
});
