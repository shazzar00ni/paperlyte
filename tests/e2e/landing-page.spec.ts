import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Your thoughts deserve a lightning-fast home/i }))
      .toBeVisible()
  })

  test('should display hero content', async ({ page }) => {
    // Check for hero text
    await expect(page.getByText(/Paperlyte is the distraction-free note-taking app/i))
      .toBeVisible()

    // Check for call-to-action buttons
    await expect(page.getByRole('button', { name: /Join the Waitlist/i }))
      .toBeVisible()
    
    await expect(page.getByRole('button', { name: /Watch Demo/i }))
      .toBeVisible()
  })

  test('should display feature cards', async ({ page }) => {
    // Check for key features
    await expect(page.getByText('Lightning Fast')).toBeVisible()
    await expect(page.getByText('Private & Secure')).toBeVisible()
    await expect(page.getByText('Works Everywhere')).toBeVisible()
    await expect(page.getByText('Smart Search')).toBeVisible()
    await expect(page.getByText('Organize Effortlessly')).toBeVisible()
    await expect(page.getByText('Minimal by Design')).toBeVisible()
  })

  test('should open waitlist modal when clicking join waitlist', async ({ page }) => {
    await page.getByRole('button', { name: /Join the Waitlist/i }).click()
    
    // Check if modal opened
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/Join the Waitlist/i)).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Elements should still be visible on mobile
    await expect(page.getByRole('heading', { name: /Your thoughts deserve a lightning-fast home/i }))
      .toBeVisible()
    
    await expect(page.getByRole('button', { name: /Join the Waitlist/i }))
      .toBeVisible()
  })

  test('should have proper SEO meta tags', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Paperlyte/)
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', expect.stringContaining('note-taking'))
  })

  test('should track analytics events', async ({ page }) => {
    // Mock PostHog to verify tracking
    await page.addInitScript(() => {
      window.mockPostHogEvents = []
      window.posthog = {
        capture: (event, properties) => {
          window.mockPostHogEvents.push({ event, properties })
        }
      }
    })

    await page.reload()
    
    // Verify page view was tracked
    const events = await page.evaluate(() => window.mockPostHogEvents)
    expect(events.some(e => e.event.includes('page_view') || e.event.includes('landing_page_view')))
      .toBeTruthy()
  })

  test('should handle demo button click', async ({ page }) => {
    await page.getByRole('button', { name: /Watch Demo/i }).click()
    
    // Demo functionality may not be implemented yet, but button should be clickable
    // This test ensures the button exists and is interactive
  })

  test('should display footer information', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // Check for footer content (adjust based on actual footer content)
    await expect(page.getByText(/MIT/i).or(page.getByText(/License/i))).toBeVisible()
  })
})