import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/support-browser',
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3004', launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } },
  webServer: {
    command: 'SUPPORT_CHECKOUT_ENABLED=true npm run dev -- --port 3004',
    url: 'http://localhost:3004/support',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
