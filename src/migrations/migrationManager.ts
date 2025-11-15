/**
 * Database Migration Manager
 * Handles data schema migrations for future API backend transition
 *
 * Current: localStorage-based migrations
 * Future: Will be extended for API/database migrations in Q4 2025
 */

export interface Migration {
  version: number
  name: string
  description: string
  up: () => Promise<void>
  down: () => Promise<void>
}

export interface MigrationStatus {
  currentVersion: number
  appliedMigrations: number[]
  pendingMigrations: Migration[]
  lastMigrated: string | null
}

const MIGRATION_KEY = 'paperlyte_migrations'

class MigrationManager {
  private migrations: Migration[] = []

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.push(migration)
    this.migrations.sort((a, b) => a.version - b.version)
  }

  /**
   * Get current migration status
   */
  getStatus(): MigrationStatus {
    const status = this.loadMigrationStatus()
    const appliedVersions = new Set(status.appliedMigrations)
    const pendingMigrations = this.migrations.filter(
      m => !appliedVersions.has(m.version)
    )

    return {
      currentVersion: status.currentVersion,
      appliedMigrations: status.appliedMigrations,
      pendingMigrations,
      lastMigrated: status.lastMigrated,
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    const status = this.getStatus()

    if (status.pendingMigrations.length === 0) {
      return
    }

    for (const migration of status.pendingMigrations) {
      try {
        await migration.up()
        this.markMigrationComplete(migration.version)
      } catch (error) {
        throw new Error(
          `Migration ${migration.version} (${migration.name}) failed: ${error}`
        )
      }
    }
  }

  /**
   * Rollback a specific migration
   */
  async rollback(version: number): Promise<void> {
    const migration = this.migrations.find(m => m.version === version)

    if (!migration) {
      throw new Error(`Migration ${version} not found`)
    }

    const status = this.loadMigrationStatus()
    if (!status.appliedMigrations.includes(version)) {
      throw new Error(`Migration ${version} has not been applied`)
    }

    try {
      await migration.down()
      this.markMigrationRolledBack(version)
    } catch (error) {
      throw new Error(`Rollback of migration ${version} failed: ${error}`)
    }
  }

  /**
   * Load migration status from storage
   */
  private loadMigrationStatus(): {
    currentVersion: number
    appliedMigrations: number[]
    lastMigrated: string | null
  } {
    try {
      const stored = localStorage.getItem(MIGRATION_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Return default status on error
    }

    return {
      currentVersion: 0,
      appliedMigrations: [],
      lastMigrated: null,
    }
  }

  /**
   * Save migration status to storage
   */
  private saveMigrationStatus(status: {
    currentVersion: number
    appliedMigrations: number[]
    lastMigrated: string | null
  }): void {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(status))
  }

  /**
   * Mark a migration as complete
   */
  private markMigrationComplete(version: number): void {
    const status = this.loadMigrationStatus()
    if (!status.appliedMigrations.includes(version)) {
      status.appliedMigrations.push(version)
      status.appliedMigrations.sort((a, b) => a - b)
    }
    status.currentVersion = Math.max(status.currentVersion, version)
    status.lastMigrated = new Date().toISOString()
    this.saveMigrationStatus(status)
  }

  /**
   * Mark a migration as rolled back
   */
  private markMigrationRolledBack(version: number): void {
    const status = this.loadMigrationStatus()
    status.appliedMigrations = status.appliedMigrations.filter(
      v => v !== version
    )
    status.currentVersion =
      status.appliedMigrations.length > 0
        ? Math.max(...status.appliedMigrations)
        : 0
    status.lastMigrated = new Date().toISOString()
    this.saveMigrationStatus(status)
  }

  /**
   * Check if migrations are needed
   */
  needsMigration(): boolean {
    return this.getStatus().pendingMigrations.length > 0
  }

  /**
   * Get list of all registered migrations
   */
  getMigrations(): Migration[] {
    return [...this.migrations]
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager()
