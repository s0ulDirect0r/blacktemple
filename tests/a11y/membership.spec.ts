import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Every membership state the UI must handle, and the pages each one should be checked on.
const STATES = ['none', 'pending', 'witness', 'companion', 'champion', 'past-due', 'canceled', 'revoked', 'expired'] as const;
const PUBLIC_PAGES = ['/membership', '/login', '/login/verify', '/login/recover', '/login/reset'];
const MEMBER_PAGES = ['/members', '/members/gatherings', '/members/conversations', '/members/membership', '/members/support'];
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'phone', width: 390, height: 844 }];
const SESSION_FILE = 'test-results/a11y-session.json';

function setFixture(state: string) {
  const args = ['run', '-s', 'membership:fixtures', '--', state];
  if (process.env.MEMBERSHIP_FIXTURES_ALLOW_REMOTE === 'true') args.push('--allow-remote');
  execFileSync('npm', args, { stdio: 'pipe' });
}

/** Accessibility rules plus structure every page needs regardless of design. */
async function audit(page: Page, path: string, viewport: string) {
  await expect(page.locator('main'), `${path} should have one main landmark`).toHaveCount(1);
  await expect(page.locator('h1'), `${path} should have exactly one h1`).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${path} scrolls sideways at ${viewport} width`).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.map(v => `${v.id} (${v.impact}): ${v.nodes.length}× ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`), `${path} at ${viewport}`).toEqual([]);
  expect(await withoutFocusIndicator(page), `${path} has focusable elements with no visible keyboard focus at ${viewport}`).toEqual([]);
}

/** Focusable elements whose look does not change at all when they receive keyboard focus. */
async function withoutFocusIndicator(page: Page) {
  return page.evaluate(() => {
    const look = (el: Element) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor, s.color, s.textDecorationLine].join('|'); };
    const focusable = [...document.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.getClientRects().length > 0 && !el.closest('[hidden]'));
    const missing: string[] = [];
    for (const el of focusable) {
      el.blur();
      const before = look(el);
      el.focus({ focusVisible: true } as FocusOptions);
      if (look(el) === before) missing.push(el.outerHTML.slice(0, 90));
      el.blur();
    }
    return missing;
  });
}

// What My Membership must say in each state, so a silent sign-out or wrong fixture cannot pass as a clean page.
const MEMBERSHIP_TEXT: Partial<Record<typeof STATES[number], string>> = {
  none: "You don't have a membership term yet", witness: 'Your studio door is open.', companion: 'Your studio door is open.',
  champion: 'Your studio door is open.', 'past-due': 'A monthly payment is overdue', canceled: 'Your access continues through the time you paid for',
  revoked: 'access under review', expired: 'This membership is closed.',
};

async function visitAll(page: Page, paths: string[], state?: typeof STATES[number]) {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    const titles = new Map<string, string>();
    for (const path of paths) {
      await test.step(`${path} · ${viewport.name}`, async () => {
        await page.goto(path);
        // Screen readers announce the title on navigation, so each page needs its own.
        const title = await page.title();
        expect(titles.get(title), `${path} shares its title "${title}"`).toBeUndefined();
        titles.set(title, path);
        expect(new URL(page.url()).pathname, `${path} should not redirect`).toBe(path);
        if (path === '/members/membership' && state && MEMBERSHIP_TEXT[state]) await expect(page.getByText(MEMBERSHIP_TEXT[state]!)).toBeVisible();
        await audit(page, path, viewport.name);
      });
    }
  }
}

test.describe.configure({ mode: 'serial' });

test('public pages', async ({ page }) => { await visitAll(page, PUBLIC_PAGES); });

test.describe('member pages', () => {
  // Sign in once: the sign-in endpoint is rate limited, and sessions survive fixture state changes.
  test.beforeAll(async ({ browser, baseURL }) => {
    setFixture('none');
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const response = await context.request.post('/api/member-auth/sign-in/email', {
      data: { email: process.env.MEMBERSHIP_FIXTURE_EMAIL, password: process.env.MEMBERSHIP_FIXTURE_PASSWORD },
      headers: { origin: new URL(baseURL!).origin },
    });
    expect(response.ok(), `fixture account signs in: ${response.status()} ${await response.text()}`).toBeTruthy();
    await context.storageState({ path: SESSION_FILE });
    await context.close();
  });
  test.use({ storageState: SESSION_FILE });
  for (const state of STATES) {
    test(state, async ({ page }) => { setFixture(state); await visitAll(page, MEMBER_PAGES, state); });
  }
});
