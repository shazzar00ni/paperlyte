#!/usr/bin/env node

/**
 * Codebase Audit Report Generator
 *
 * This script generates/updates the CODEBASE_AUDIT_REPORT.md with:
 * - Current timestamps
 * - Contact information from package.json
 * - Automated metadata injection
 */

/* eslint-disable no-console */

import fs from 'fs'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

/**
 * Read package.json for author information
 */
function getProjectInfo() {
  const packagePath = path.join(projectRoot, 'package.json')
  
  if (!fs.existsSync(packagePath)) {
    console.error('❌ package.json not found at project root')
    process.exit(1)
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
  } catch (error) {
    console.error('❌ Failed to parse package.json:', error.message)
    process.exit(1)
  }

  return {
    author: packageJson.author || 'Paperlyte Team <hello@paperlyte.com>',
    name: packageJson.name || 'paperlyte',
    version: packageJson.version || '1.0.0',
  }
}

/**
 * Generate timestamp metadata
 */
function generateTimestamps() {
  const now = new Date()

  return {
    generated: now.toISOString(),
    lastUpdated: now.toISOString(),
    generatedFormatted: now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
  }
}

/**
 * Update the audit report with current metadata
 */
function updateAuditReport() {
  const auditReportPath = path.join(
    projectRoot,
    'docs',
    'CODEBASE_AUDIT_REPORT.md'
  )

  if (!fs.existsSync(auditReportPath)) {
    console.error('CODEBASE_AUDIT_REPORT.md not found')
    process.exit(1)
  }

  const projectInfo = getProjectInfo()
  const timestamps = generateTimestamps()

  let content = fs.readFileSync(auditReportPath, 'utf-8')

  // Update the footer section with dynamic content
  const footerRegex = /---\n\n\*\*Generated\*\*:.*$/s

  const newFooter = `---

**Generated**: ${timestamps.generatedFormatted} via \`npm run audit:codebase\`
**Last Updated**: ${timestamps.generated}
**Contact**: ${projectInfo.author}
**Version**: ${projectInfo.version}

> Contact information sourced from [CONTACT.md](CONTACT.md) | Timestamps auto-generated`

  if (footerRegex.test(content)) {
    content = content.replace(footerRegex, newFooter)
  } else {
    // If footer pattern doesn't match, append new footer
    content = content.trimEnd() + '\n\n' + newFooter
  }
  fs.writeFileSync(auditReportPath, content, 'utf-8')

  console.log('✅ Codebase audit report updated successfully')
  console.log(`📅 Generated: ${timestamps.generatedFormatted}`)
  console.log(`👥 Contact: ${projectInfo.author}`)
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Updating Codebase Audit Report...')

  try {
    updateAuditReport()
  } catch (error) {
    console.error('❌ Error updating audit report:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { generateTimestamps, getProjectInfo, updateAuditReport }
