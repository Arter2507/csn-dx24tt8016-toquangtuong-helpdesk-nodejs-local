import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.HELPDESK_URL ?? 'http://127.0.0.1:4200',
    channel: 'msedge',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
