import { test as base, expect, Page } from '@playwright/test'

/**
 * E2E Test Fixtures - CodeB Platform
 * Provides reusable test utilities and authenticated contexts
 */

// Test user credentials for E2E tests
export const TEST_USER = {
  email: 'e2e-test@codeb.app',
  name: 'E2E Test User',
  id: 'test-user-e2e-001',
}

export const TEST_WORKSPACE = {
  id: 'test-workspace-e2e-001',
  name: 'E2E Test Workspace',
  slug: 'e2e-test-workspace',
}

// Extended test fixture with authentication helpers
export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page, context }, use) => {
    // Mock NextAuth session by setting cookies
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'e2e-test-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'next-auth.csrf-token',
        value: 'e2e-test-csrf-token',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ])

    await use(page)
  },
})

export { expect }

// Page Object Models
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async isVisible() {
    return this.page.locator('text=로그인').or(this.page.locator('text=Login')).isVisible()
  }

  get googleLoginButton() {
    return this.page.getByRole('button', { name: /google/i })
  }

  get emailInput() {
    return this.page.getByPlaceholder(/email/i)
  }

  get passwordInput() {
    return this.page.getByPlaceholder(/password/i)
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /login|로그인/i })
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  get statsSection() {
    return this.page.locator('[data-testid="dashboard-stats"]').or(
      this.page.locator('.dashboard-stats')
    )
  }

  get navigationSidebar() {
    return this.page.locator('nav').or(this.page.locator('[role="navigation"]'))
  }

  get projectsLink() {
    return this.page.getByRole('link', { name: /project|프로젝트/i })
  }

  get tasksLink() {
    return this.page.getByRole('link', { name: /task|작업/i })
  }

  get settingsLink() {
    return this.page.getByRole('link', { name: /setting|설정/i })
  }
}

export class WorkspacePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/workspace')
  }

  async gotoCreate() {
    await this.page.goto('/workspace/create')
  }

  get workspaceNameInput() {
    return this.page.getByPlaceholder(/workspace name|워크스페이스 이름/i)
  }

  get createButton() {
    return this.page.getByRole('button', { name: /create|생성/i })
  }

  get workspaceList() {
    return this.page.locator('[data-testid="workspace-list"]').or(
      this.page.locator('.workspace-list')
    )
  }

  get membersSection() {
    return this.page.locator('[data-testid="members-section"]').or(
      this.page.locator('.members-section')
    )
  }
}

// Helper functions
export async function mockNextAuthSession(page: Page, user = TEST_USER) {
  // Intercept NextAuth session endpoint
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
  })
}

export async function mockUnauthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')
}

export async function takeScreenshotOnFailure(page: Page, testInfo: { title: string }) {
  await page.screenshot({
    path: `playwright-report/screenshots/${testInfo.title.replace(/\s+/g, '-')}.png`,
    fullPage: true,
  })
}
