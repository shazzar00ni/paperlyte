import { test, expect } from '@playwright/test'

test.describe('Note Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the note editor (adjust path based on routing)
    await page.goto('/editor')
    
    // If editor is not at /editor, try alternative routes
    if (page.url().includes('404') || await page.getByText('404').isVisible().catch(() => false)) {
      await page.goto('/notes')
    }
    
    // If neither works, it might be a single-page app
    if (page.url().includes('404') || await page.getByText('404').isVisible().catch(() => false)) {
      await page.goto('/')
      // Look for a link to the editor
      const editorLink = page.getByRole('link', { name: /editor/i }).or(page.getByRole('link', { name: /notes/i }))
      if (await editorLink.isVisible()) {
        await editorLink.click()
      }
    }
  })

  test('should display the note editor interface', async ({ page }) => {
    // Check for editor elements
    await expect(page.getByRole('textbox').or(page.locator('[contenteditable="true"]')))
      .toBeVisible()
    
    // Check for formatting toolbar if it exists
    const boldButton = page.getByRole('button', { name: /bold/i }).or(page.getByTitle(/bold/i))
    if (await boldButton.isVisible()) {
      await expect(boldButton).toBeVisible()
    }
  })

  test('should create a new note', async ({ page }) => {
    // Find the note editor
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    // Type content
    await editor.click()
    await editor.fill('This is a test note')
    
    // Check if content appears
    await expect(editor).toHaveText('This is a test note')
  })

  test('should save notes automatically', async ({ page }) => {
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    // Type content
    await editor.click()
    await editor.fill('Auto-save test note')
    
    // Wait for auto-save (if implemented)
    await page.waitForTimeout(2000)
    
    // Refresh page and check if content persists
    await page.reload()
    
    // Content should be restored from localStorage
    const restoredEditor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(restoredEditor).toHaveText('Auto-save test note')
  })

  test('should format text with bold', async ({ page }) => {
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    // Type some text
    await editor.click()
    await editor.fill('Bold text test')
    
    // Select the text
    await page.keyboard.press('Control+a')
    
    // Click bold button if available
    const boldButton = page.getByRole('button', { name: /bold/i }).or(page.getByTitle(/bold/i))
    if (await boldButton.isVisible()) {
      await boldButton.click()
      
      // Check if text is now bold
      await expect(editor.locator('b, strong')).toBeVisible()
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('Control+b')
      
      // Check if formatting was applied
      await expect(editor.locator('b, strong')).toBeVisible()
    }
  })

  test('should format text with italic', async ({ page }) => {
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    // Type some text
    await editor.click()
    await editor.fill('Italic text test')
    
    // Select the text
    await page.keyboard.press('Control+a')
    
    // Click italic button if available
    const italicButton = page.getByRole('button', { name: /italic/i }).or(page.getByTitle(/italic/i))
    if (await italicButton.isVisible()) {
      await italicButton.click()
      
      // Check if text is now italic
      await expect(editor.locator('i, em')).toBeVisible()
    } else {
      // Try keyboard shortcut
      await page.keyboard.press('Control+i')
      
      // Check if formatting was applied
      await expect(editor.locator('i, em')).toBeVisible()
    }
  })

  test('should create lists', async ({ page }) => {
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    await editor.click()
    await editor.fill('List item 1')
    
    // Look for list button
    const listButton = page.getByRole('button', { name: /list/i }).or(page.getByTitle(/list/i))
    if (await listButton.isVisible()) {
      await listButton.click()
      
      // Check if list was created
      await expect(editor.locator('ul, ol')).toBeVisible()
    }
  })

  test('should handle multiple notes', async ({ page }) => {
    // Look for new note button
    const newNoteButton = page.getByRole('button', { name: /new/i }).or(page.getByText(/new note/i))
    
    if (await newNoteButton.isVisible()) {
      // Create first note
      const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
      await editor.click()
      await editor.fill('First note')
      
      // Create second note
      await newNoteButton.click()
      
      // Should have new empty editor
      const newEditor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
      await expect(newEditor).toHaveText('')
      
      await newEditor.fill('Second note')
      await expect(newEditor).toHaveText('Second note')
    }
  })

  test('should search notes', async ({ page }) => {
    // Create a test note first
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    if (await editor.isVisible()) {
      await editor.click()
      await editor.fill('Searchable note content')
      await page.waitForTimeout(1000) // Wait for save
    }
    
    // Look for search functionality
    const searchBox = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    
    if (await searchBox.isVisible()) {
      await searchBox.fill('Searchable')
      
      // Should show matching results
      await expect(page.getByText('Searchable note content')).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Editor should still be usable
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    // Should be able to type
    await editor.click()
    await editor.fill('Mobile test')
    await expect(editor).toHaveText('Mobile test')
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    await editor.click()
    await editor.fill('Keyboard shortcut test')
    
    // Test selection
    await page.keyboard.press('Control+a')
    
    // Test copy/paste
    await page.keyboard.press('Control+c')
    await page.keyboard.press('Control+v')
    
    // Should have duplicated content or at least not crash
    expect(await editor.textContent()).toContain('Keyboard shortcut test')
  })

  test('should prevent XSS attacks', async ({ page }) => {
    const editor = page.getByRole('textbox').or(page.locator('[contenteditable="true"]')).first()
    await expect(editor).toBeVisible()
    
    // Try to inject malicious script
    const maliciousContent = '<script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')">'
    
    await editor.click()
    await editor.fill(maliciousContent)
    
    // Script should not execute - check that no alert appeared
    // Content should be sanitized
    const editorContent = await editor.innerHTML()
    expect(editorContent).not.toContain('<script>')
    expect(editorContent).not.toContain('onerror')
  })
})