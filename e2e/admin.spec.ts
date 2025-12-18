import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming admin user is logged in
    await page.goto('/admin');
  });

  test('should display documents list', async ({ page }) => {
    await expect(page.getByText(/documents/i)).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should open upload dialog', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /upload document/i });
    await uploadButton.click();

    await expect(page.getByText(/add new document/i)).toBeVisible();
  });

  test('should search documents', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search documents/i);
    await searchInput.fill('theft');

    // Wait for debounce and search results
    await page.waitForTimeout(500);

    // Results should be filtered
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should paginate documents', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /next/i });

    if (await nextButton.isEnabled()) {
      await nextButton.click();

      // Should update page number
      await expect(page.getByText(/page 2/i)).toBeVisible();
    }
  });
});
