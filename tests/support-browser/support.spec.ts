import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('custom amount, retry, single-submit, and checkout redirect work at phone and desktop widths', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/support');
    await expect(page.getByRole('heading', { name: 'Support the Temple' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    const input = page.getByLabel('Your amount in USD');
    await input.fill('0.99');
    await page.getByRole('button', { name: 'Continue to one-time payment' }).click();
    await expect(page.locator('#support-error')).toContainText('from $1 to $1,000');
    const requests: { amount: string; requestId: string }[] = [];
    await page.route('**/api/support/checkout', async route => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 1) await route.fulfill({ status: 503, json: { error: 'Checkout is unavailable. Please try again later.' } });
      else await route.fulfill({ json: { url: 'https://checkout.stripe.com/test-support' } });
    });
    await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Stripe redirect fixture</h1>' }));
    await input.fill('12.34');
    await page.screenshot({ path: `/tmp/blacktemple-support-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Give $12.34 USD once' }).click();
    await expect(page.locator('#support-error')).toContainText('unavailable');
    await page.getByRole('button', { name: 'Give $12.34 USD once' }).click();
    await page.waitForURL('https://checkout.stripe.com/test-support');
    expect(requests).toHaveLength(2);
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[0].amount).toBe('12.34');
    await page.unrouteAll();
  }
});

test('support form and cancellation/confirmation states are accessible and do not claim an unverified payment', async ({ page }) => {
  await page.goto('/support?checkout=cancelled');
  await expect(page.getByRole('status')).toContainText('You left checkout');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.goto('/support/thanks?session_id=fake');
  await expect(page.getByRole('heading', { name: 'Checking your support' })).toBeVisible();
  await expect(page.locator('main')).toContainText("We couldn't confirm a completed support payment");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
});

test('homepage retains the scene with a modest keyboard-accessible support link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Support the Temple', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Support the Temple', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/support');
  await expect(page.getByRole('heading', { name: 'Support the Temple' })).toBeVisible();
});
