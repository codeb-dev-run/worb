import { test as setup } from '@playwright/test'

/**
 * Authentication Setup
 * Runs before all tests to prepare the test environment
 */

setup('verify test environment', async ({ page }) => {
  // Verify that the test server is running
  const response = await page.request.get('/')

  // Server should be responding (any status is fine, as long as it's responding)
  console.log(`[Setup] Server responding with status: ${response.status()}`)
})

setup('prepare authentication state', async ({ page, context }) => {
  // This setup runs before all tests
  // We use route mocking for authentication in individual tests
  // This setup ensures the browser context is ready

  console.log('[Setup] Authentication state prepared')
})
