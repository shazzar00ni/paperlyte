/**
 * Migration Registry
 * Import and register all migrations here
 */

import { migrationManager } from './migrationManager'
import { migration001InitialSchema } from './001-initial-schema'

// Register all migrations
migrationManager.registerMigration(migration001InitialSchema)

// Export migration manager
export { migrationManager }
export type { Migration, MigrationStatus } from './migrationManager'
