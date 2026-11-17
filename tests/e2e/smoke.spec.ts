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

for (const path of ["/about", "/services", "/how-it-works", "/equipment", "/pricing", "/contact"]) {
  test(`${path} renders with a single page heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
}

test("main navigation links to the Equipment page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Equipment" })
    .click();
  await expect(page).toHaveURL(/\/equipment$/);
});
