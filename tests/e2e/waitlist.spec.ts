import { test, expect } from '@playwright/test'

test.describe('Waitlist Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Open waitlist modal
    await page.getByRole('button', { name: /Join Waitlist/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('should display waitlist form', async ({ page }) => {
    // Check form fields
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/^name/i)).toBeVisible()
    await expect(page.getByLabel(/interested as/i)).toBeVisible()

    // Check submit button
    await expect(
      page.getByRole('button', { name: /join waitlist/i })
    ).toBeVisible()
  })

  test('should require email field', async ({ page }) => {
    // Try to submit without email
    await page.getByLabel(/^name/i).fill('Test User')
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Should show validation error or prevent submission
    const emailField = page.getByLabel(/email address/i)
    await expect(emailField).toBeFocused()
  })

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.getByLabel(/email address/i).fill('invalid-email')
    await page.getByLabel(/^name/i).fill('Test User')
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Should show validation error
    await expect(
      page.getByText(/valid email/i).or(page.getByText(/invalid/i))
    ).toBeVisible()
  })

  test('should successfully submit valid form', async ({ page }) => {
    // Fill out form with valid data
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/^name/i).fill('Test User')

    // Select interest
    const interestField = page.getByLabel(/interested as/i)
    await interestField.selectOption('professional')

    // Submit form
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Should show success message
    await expect(
      page.getByText(/you're on the list/i).or(page.getByText(/thank you/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test('should prevent duplicate email submissions', async ({ page }) => {
    const testEmail = 'duplicate@example.com'

    // Submit first time
    await page.getByLabel(/email address/i).fill(testEmail)
    await page.getByLabel(/^name/i).fill('Test User')
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Wait for success
    await expect(
      page.getByText(/you're on the list/i).or(page.getByText(/thank you/i))
    ).toBeVisible({ timeout: 10000 })

    // Close modal and reopen
    await page.getByRole('button', { name: /close/i }).click()
    await page.getByRole('button', { name: /Join Waitlist/i }).click()

    // Try to submit same email again
    await page.getByLabel(/email address/i).fill(testEmail)
    await page.getByLabel(/^name/i).fill('Another User')
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Should show duplicate error
    await expect(
      page.getByText(/already/i).or(page.getByText(/duplicate/i))
    ).toBeVisible({ timeout: 10000 })
  })

  test('should close modal on close button', async ({ page }) => {
    await page.getByRole('button', { name: /close/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should close modal on escape key', async ({ page }) => {
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should close modal when clicking outside', async ({ page }) => {
    // Click on the backdrop/overlay
    await page.mouse.click(100, 100) // Click outside modal
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should track waitlist events', async ({ page }) => {
    // Mock analytics tracking
    await page.addInitScript(() => {
      window.mockWaitlistEvents = []
      window.posthog = {
        capture: (event, properties) => {
          if (event.includes('waitlist')) {
            window.mockWaitlistEvents.push({ event, properties })
          }
        },
      }
    })

    await page.reload()

    // Open waitlist again after reload
    await page.getByRole('button', { name: /Join Waitlist/i }).click()

    // Submit form
    await page.getByLabel(/email address/i).fill('analytics@example.com')
    await page.getByLabel(/^name/i).fill('Analytics User')
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Check that analytics events were fired
    const events = await page.evaluate(() => window.mockWaitlistEvents)
    expect(events.length).toBeGreaterThan(0)
  })

  test('should be accessible', async ({ page }) => {
    // Check that form elements have proper labels
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/^name/i)).toBeVisible()

    // Check that modal has proper role
    await expect(page.getByRole('dialog')).toBeVisible()

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/email address/i)).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/^name/i)).toBeFocused()
  })

  test('should handle form submission errors gracefully', async ({ page }) => {
    // Mock a server error
    await page.route('**/api/waitlist', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

    // Submit form
    await page.getByLabel(/email address/i).fill('error@example.com')
    await page.getByLabel(/^name/i).fill('Error User')
    await page.getByRole('button', { name: /join waitlist/i }).click()

    // Should show error message
    await expect(
      page.getByText(/error/i).or(page.getByText(/try again/i))
    ).toBeVisible({ timeout: 10000 })
  })
})
