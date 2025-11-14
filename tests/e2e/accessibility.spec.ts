import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * End-to-End Accessibility Tests
 * Tests accessibility across different pages and user workflows
 * Uses axe-core to check WCAG 2.1 Level A and AA compliance
 */

test.describe('Accessibility E2E Tests', () => {
  test('Landing page should be accessible', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Landing page should be keyboard navigable', async ({ page }) => {
    await page.goto('/')

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    const firstFocusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    )
    expect(firstFocusedElement).toBeTruthy()

    // Ensure focus indicators are visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('Waitlist modal should be accessible', async ({ page }) => {
    await page.goto('/')

    // Open waitlist modal
    await page.getByRole('button', { name: /join the waitlist/i }).click()

    // Run accessibility scan on modal
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Waitlist modal should trap focus', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /join the waitlist/i }).click()

    // Get all focusable elements in modal
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // Tab through modal elements
    await page.keyboard.press('Tab')
    const firstFocus = await page.evaluate(() =>
      document.activeElement?.getAttribute('name')
    )

    // Tab to last element and back to first (focus trap)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
    }

    // Verify focus is still within modal
    const currentFocus = await page.evaluate(() => {
      const activeEl = document.activeElement
      return activeEl?.closest('[role="dialog"]') !== null
    })
    expect(currentFocus).toBeTruthy()
  })

  test('Waitlist modal should close on Escape key', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /join the waitlist/i }).click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('Note editor should be accessible', async ({ page }) => {
    // Navigate to note editor (adjust path based on actual routing)
    await page.goto('/')

    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Rich text editor should have proper ARIA attributes', async ({
    page,
  }) => {
    await page.goto('/')

    // Look for contenteditable elements (rich text editor)
    const editor = page.locator('[contenteditable="true"]').first()

    if (await editor.isVisible()) {
      // Check for proper ARIA role
      const ariaRole = await editor.getAttribute('role')
      expect(['textbox', 'document']).toContain(ariaRole)

      // Run accessibility scan on editor
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('[contenteditable="true"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    }
  })

  test('Color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze()

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    )

    expect(contrastViolations).toEqual([])
  })

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze()

    // Filter for image alt text violations
    const imageViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'image-alt'
    )

    expect(imageViolations).toEqual([])
  })

  test('Form inputs should have labels', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /join the waitlist/i }).click()

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a'])
      .analyze()

    // Filter for form label violations
    const labelViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'label'
    )

    expect(labelViolations).toEqual([])
  })

  test('Headings should be in logical order', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze()

    // Filter for heading order violations
    const headingViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'heading-order'
    )

    expect(headingViolations).toEqual([])
  })

  test('Page should have proper language attribute', async ({ page }) => {
    await page.goto('/')

    const htmlLang = await page.locator('html').getAttribute('lang')
    expect(htmlLang).toBeTruthy()
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
  })

  test('Interactive elements should have visible focus indicators', async ({
    page,
  }) => {
    await page.goto('/')

    // Tab to first interactive element
    await page.keyboard.press('Tab')

    // Check if focus is visible
    const focusedElement = page.locator(':focus').first()
    await expect(focusedElement).toBeVisible()

    // Get computed styles to check for focus indicator
    const { outlineWidth, boxShadow } = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      }
    })

    // Focus indicator should be visible via outline or box shadow
    expect(
      outlineWidth !== '0px' ||
        (boxShadow !== undefined && boxShadow !== 'none')
    ).toBeTruthy()
  })

  test('Buttons should have accessible names', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze()

    // Filter for button name violations
    const buttonViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'button-name'
    )

    expect(buttonViolations).toEqual([])
  })

  test('Skip to main content link should be present', async ({ page }) => {
    await page.goto('/')

    // Check for skip link (may be visually hidden)
    const skipLink = page.locator('a[href="#main"], a[href="#content"]').first()
    
    // Require the skip link to be present
    expect(await skipLink.count()).toBeGreaterThan(0)

    // Focus the skip link
    await page.keyboard.press('Tab')

    // Verify it becomes visible on focus
    await expect(skipLink).toBeFocused()
  })

  test('Mobile navigation should be accessible', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Error messages should be announced to screen readers', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /join the waitlist/i }).click()

    // Try to submit with invalid data
    const submitButton = page.getByRole('button', { name: /join waitlist/i })
    await submitButton.click()

    // Check for ARIA live regions or role=alert
    const errorRegions = page.locator(
      '[role="alert"], [aria-live="polite"], [aria-live="assertive"]'
    )

    expect(await errorRegions.count()).toBeGreaterThan(0)
    await expect(errorRegions.first()).toBeVisible()
  })

  test('Loading states should be announced to screen readers', async ({
    page,
  }) => {
    await page.goto('/')

    // Look for loading indicators with proper ARIA attributes
    const loadingIndicators = page.locator(
      '[role="status"], [aria-live], [aria-busy="true"]'
    )

    // If loading indicators exist, verify they have proper attributes
    if ((await loadingIndicators.count()) > 0) {
      const firstIndicator = loadingIndicators.first()
      const ariaLive = await firstIndicator.getAttribute('aria-live')
      const role = await firstIndicator.getAttribute('role')

      expect(
        ['status', 'progressbar', 'alert'].includes(role || '') ||
          ['polite', 'assertive'].includes(ariaLive || '')
      ).toBeTruthy()
    }
  })
})
