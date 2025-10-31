/**
 * Migration 001: Initial Schema
 * Establishes baseline data structure for localStorage
 */

import type { Migration } from './migrationManager'

export const migration001InitialSchema: Migration = {
  version: 1,
  name: 'initial-schema',
  description: 'Initialize baseline data structure for notes and metadata',

  async up() {
    // Ensure all required keys exist with proper structure
    const keys = [
      'paperlyte_notes',
      'paperlyte_waitlist_entries',
      'paperlyte_settings',
    ]

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]))
      }
    }

    // Initialize application settings
    const settings = localStorage.getItem('paperlyte_settings')
    if (!settings || settings === '[]') {
      localStorage.setItem(
        'paperlyte_settings',
        JSON.stringify({
          version: '0.1.0',
          createdAt: new Date().toISOString(),
          theme: 'light',
        })
      )
    }
  },

  async down() {
    // Note: We typically don't delete data in rollback
    // Instead, we could mark it as inactive or archive it
  },
}
