/**
 * Auth setup: creates a test user via the sign-up form, then logs in
 * and saves the session cookie so all subsequent tests can access protected routes.
 *
 * The forms use React useId() for element IDs, so we use label/placeholder selectors.
 * All navigations use waitUntil: 'domcontentloaded' because the Next.js dev server
 * keeps long-lived HMR connections that prevent the 'load' event from firing.
 */
import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = 'e2e-playwright@openvideo.dev';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_NAME = 'E2E Playwright';
const AUTH_FILE = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Step 1: Try to sign up (will fail gracefully if user already exists)
  await page.goto('/signup', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible({
    timeout: 15_000,
  });

  const signupHeading = page.getByText('Create your account');
  if (await signupHeading.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await page.getByPlaceholder('Jane Smith').fill(TEST_NAME);
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL);
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for either dashboard redirect, verify-email redirect, or error
    await Promise.race([
      page.waitForURL(/dashboard/, {
        timeout: 15_000,
        waitUntil: 'domcontentloaded',
      }),
      page.waitForURL(/verify-email/, {
        timeout: 15_000,
        waitUntil: 'domcontentloaded',
      }),
      page.waitForSelector('[class*="destructive"]', { timeout: 15_000 }),
    ]).catch(() => {
      // Any outcome is acceptable
    });

    // If we got redirected to dashboard, we're already logged in
    if (page.url().includes('/dashboard')) {
      await page.goto('/dashboard/text-to-video', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForURL(/dashboard\/text-to-video/, {
        timeout: 15_000,
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('h1')).toContainText('Text to Video', {
        timeout: 10_000,
      });
      await page.context().storageState({ path: AUTH_FILE });
      return;
    }
  }

  // Step 2: Log in via login form
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible({
    timeout: 15_000,
  });

  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL);
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  });

  // Step 3: Verify we can access the text-to-video protected route
  await page.goto('/dashboard/text-to-video', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForURL(/dashboard\/text-to-video/, {
    timeout: 15_000,
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('h1')).toContainText('Text to Video', {
    timeout: 10_000,
  });

  // Step 4: Save storage state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE });
});
