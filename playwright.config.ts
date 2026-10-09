import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Local review setup: .env.local points the dev server and fixtures at a sandbox database.
dotenv.config({ path: '.env.local' });
const baseURL = process.env.A11Y_BASE_URL ?? 'http://localhost:3003';

export default defineConfig({
  testDir: 'tests/a11y',
  // Every test drives the same fixture account, so states must not interleave.
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  use: { baseURL },
  webServer: process.env.A11Y_BASE_URL ? undefined : {
    command: 'npm run dev -- --port 3003',
    url: baseURL + '/membership',
    // Never reuse whatever happens to be on the port: it may be another checkout.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
