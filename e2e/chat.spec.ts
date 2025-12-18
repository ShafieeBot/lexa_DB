import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming user is already logged in or using test auth
    await page.goto('/chat');
  });

  test('should display welcome message', async ({ page }) => {
    await expect(page.getByText('Welcome to Legal Research Assistant')).toBeVisible();
  });

  test('should send a message and receive response', async ({ page }) => {
    const input = page.getByPlaceholder(/ask.*question/i);
    await input.fill('What are the laws related to theft?');
    await input.press('Enter');

    // Wait for loading state
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();

    // Wait for response
    await expect(page.getByRole('article')).toHaveCount(2, { timeout: 10000 }); // user + assistant

    // Check that sources are displayed
    await expect(page.getByText(/sources/i)).toBeVisible();
  });

  test('should create new chat session', async ({ page }) => {
    const newChatButton = page.getByRole('button', { name: /new chat/i });
    await newChatButton.click();

    // Should clear messages and show welcome screen again
    await expect(page.getByText('Welcome to Legal Research Assistant')).toBeVisible();
  });
});
