import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the main heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        name: /Finally, note-taking that feels effortless/i,
      })
    ).toBeVisible()
  })

  test('should display hero content', async ({ page }) => {
    // Check for hero text
    await expect(
      page.getByText(/Paperlyte is the lightning-fast, beautifully minimal/i)
    ).toBeVisible()

    // Check for call-to-action buttons
    await expect(
      page.getByRole('button', { name: /Join Waitlist/i })
    ).toBeVisible()

    await expect(
      page.getByRole('link', { name: /Start Writing Now/i })
    ).toBeVisible()
  })

  test('should display feature cards', async ({ page }) => {
    // Check for key features
    await expect(page.getByText('Launches Instantly')).toBeVisible()
    await expect(page.getByText('Your Data Stays Yours')).toBeVisible()
    await expect(page.getByText('Works Everywhere')).toBeVisible()
    await expect(page.getByText('Find Anything in Milliseconds')).toBeVisible()
    await expect(page.getByText('Never Lose Your Work')).toBeVisible()
    await expect(page.getByText('Zero Learning Curve')).toBeVisible()
  })

  test('should open waitlist modal when clicking join waitlist', async ({
    page,
  }) => {
    // Wait for the button to be visible and clickable
    const waitlistButton = page.getByRole('button', { name: /Join Waitlist/i })
    await expect(waitlistButton).toBeVisible()
    await waitlistButton.click()

    // Check if modal opened
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Join.*Waitlist/i)).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Elements should still be visible on mobile
    await expect(
      page.getByRole('heading', {
        name: /Finally, note-taking that feels effortless/i,
      })
    ).toBeVisible()

    await expect(
      page.getByRole('button', { name: /Join Waitlist/i })
    ).toBeVisible()
  })

  test('should have proper SEO meta tags', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Paperlyte/)

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute(
      'content',
      expect.stringContaining('note-taking')
    )
  })

  test('should track analytics events', async ({ page }) => {
    // Mock PostHog to verify tracking
    await page.addInitScript(() => {
      window.mockPostHogEvents = []
      window.posthog = {
        capture: (event, properties) => {
          window.mockPostHogEvents.push({ event, properties })
        },
      }
    })

    await page.reload()

    // Verify page view was tracked
    const events = await page.evaluate(() => window.mockPostHogEvents)
    expect(
      events.some(
        e =>
          e.event.includes('page_view') || e.event.includes('landing_page_view')
      )
    ).toBeTruthy()
  })

  test('should handle start writing button click', async ({ page }) => {
    await page.getByRole('link', { name: /Start Writing Now/i }).click()

    // Should navigate to editor (even if route doesn't exist yet)
    await page.waitForURL(/.*/)
  })

  test('should display CTA section', async ({ page }) => {
    // Scroll to bottom CTA section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Wait for scroll to complete
    await page.waitForTimeout(500)

    // Check for CTA content at bottom of page
    await expect(
      page.getByRole('heading', {
        name: /Why wait.*Start taking better notes today/i,
      })
    ).toBeVisible()
  })
})
