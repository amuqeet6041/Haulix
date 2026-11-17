import { expect, test } from "@playwright/test";

test("homepage loads with the main heading and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});

test("Get Started page shows the carrier inquiry form", async ({ page }) => {
  await page.goto("/get-started");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tell us about your trucks");
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("equipment service page renders", async ({ page }) => {
  await page.goto("/services/dry-van");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dry Van");
});

test("unknown route shows the 404 page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
});
