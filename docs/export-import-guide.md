# 📤 Export/Import Guide for Paperlyte

Complete guide for backing up, transferring, and managing your Paperlyte notes.

> **🚧 Implementation Status:**  
> This guide describes features that are planned for implementation. Current version (MVP) uses localStorage only.  
> **Target Implementation:** Q4 2025 with API backend migration.

---

## 🎯 Overview

Paperlyte's export/import system is designed to give you complete control over your notes data. Whether you're backing up your notes, transferring to a new device, or migrating between browsers, this guide covers all the options.

---

## 📤 Export Options

### Quick Export

**Export All Notes (Recommended)**

1. Open Paperlyte in your browser
2. Click the menu button (☰) in the top-right corner
3. Select "Export All Notes"
4. Choose your preferred format:
   - **JSON** (Default) - Perfect for re-importing to Paperlyte
   - **Markdown** - Compatible with other note apps
   - **Plain Text** - Universal compatibility
   - **PDF** - For printing or sharing

5. Click "Download" to save the file to your device

### Selective Export

**Export Individual Notes**

1. Open the note you want to export
2. Click the note options menu (⋯) in the note header
3. Select "Export This Note"
4. Choose format and download

**Export by Date Range**

1. Use the "Export" menu
2. Select "Export by Date Range"
3. Choose start and end dates
4. Select format and download

**Export by Search Results**

1. Search for specific notes using the search box
2. Click "Export Search Results" (appears when search is active)
3. Only matching notes will be exported

---

## 📥 Import Options

### Import from Paperlyte Backup

**Restoring Complete Backup**

1. Click menu (☰) → "Import Notes"
2. Select "Import from Paperlyte Backup"
3. Choose your .json backup file
4. Select import options:
   - **Replace All Notes** - Overwrites existing notes
   - **Merge with Existing** - Adds imported notes to current collection
   - **Preview First** - Review what will be imported

5. Click "Import" to complete

### Import from Other Apps

**Supported Formats:**

- **Markdown Files** (.md) - From apps like Obsidian, Typora, etc.
- **Plain Text** (.txt) - From any text editor
- **Evernote Export** (.enex) - From Evernote exports
- **JSON** - From various note-taking apps
- **CSV** - For structured data imports

**Import Process:**

1. Menu (☰) → "Import Notes" → "Import from Other Apps"
2. Select the app or format you're importing from
3. Upload your export file
4. Map fields (title, content, date, etc.) if needed
5. Preview imported notes
6. Complete the import

### Import Individual Files

**Single File Import**

1. Drag and drop files directly onto the Paperlyte interface
2. Or use Menu → "Import" → "Import Files"
3. Supported file types: .md, .txt, .json
4. Each file becomes a separate note

---

## 🔄 Data Formats

### Paperlyte JSON Format

The native Paperlyte format preserves all data and metadata:

```json
{
  "version": "1.0",
  "exportDate": "2025-10-03T10:30:00Z",
  "notes": [
    {
      "id": "note_123456789",
      "title": "My Important Note",
      "content": "Note content with **formatting**",
      "createdAt": "2025-10-01T14:22:00Z",
      "updatedAt": "2025-10-03T09:15:00Z",
      "tags": ["work", "project-alpha"],
      "formatVersion": "richtext-v1"
    }
  ],
  "metadata": {
    "totalNotes": 1,
    "exportType": "complete"
  }
}
```

### Markdown Format

Clean, portable format compatible with most apps:

```markdown
# My Important Note

_Created: October 1, 2025_
_Updated: October 3, 2025_
_Tags: work, project-alpha_

---

Note content with **formatting** preserved as Markdown.

Lists work too:

- Item 1
- Item 2

## Headings are preserved

And so are other formatting elements.
```

### Plain Text Format

Universal compatibility, no formatting:

```text
Title: My Important Note
Created: October 1, 2025
Updated: October 3, 2025
Tags: work, project-alpha

---

Note content with formatting removed. Lists become simple text.

Headings become regular text.
```

---

## 💾 Backup Strategies

### Recommended Backup Schedule

**Daily Users:**

- Weekly full backup to local device
- Monthly backup to external storage (USB, cloud)

**Casual Users:**

- Monthly full backup
- Before major browser updates

**Professional Users:**

- Daily automated backup (when feature available)
- Weekly backup to multiple locations
- Before important presentations or deadlines

### Automated Backup (Coming Soon)

**Browser Extension Features:**

- Scheduled daily/weekly backups
- Automatic backup before browser updates
- Cloud storage integration (Google Drive, Dropbox)
- Backup verification and restoration testing

### Manual Backup Best Practices

1. **Regular Schedule:** Set calendar reminders for backups
2. **Multiple Locations:** Save backups to device + external storage
3. **Version Names:** Use dates in backup filenames
4. **Test Restores:** Periodically test importing your backups
5. **Format Variety:** Keep both JSON and Markdown backups

---

## 🔄 Migration Scenarios

### Moving Between Browsers

**Scenario:** Switching from Chrome to Firefox

1. **Export** all notes from Chrome version of Paperlyte
2. **Download** the JSON backup file
3. **Open** Paperlyte in Firefox
4. **Import** the JSON backup
5. **Verify** all notes transferred correctly

### Moving to New Computer

**Scenario:** Getting a new laptop

1. **Export** notes from old computer
2. **Transfer** backup file to new computer (email, USB, cloud)
3. **Open** Paperlyte on new computer
4. **Import** your backup file
5. **Continue** where you left off

### Switching to Different Note App

**Scenario:** Moving to Obsidian, Notion, etc.

1. **Export** notes in Markdown format
2. **Download** the .md files
3. **Import** into your new note-taking app
4. **Note:** Some formatting may need adjustment

---

## 🛠️ Advanced Import/Export

### Batch Operations

**Processing Multiple Files:**

- Import entire folders of markdown files
- Batch convert between formats
- Merge multiple Paperlyte backups
- Split large exports into smaller files

### API Integration (Developer Feature)

**Automated Backup:**

```javascript
// Example API usage for automated backup
const backup = await paperlyte.api.export.all({
  format: 'json',
  includeMetadata: true,
})

// Save to your preferred storage
await saveToCloud(backup)
```

**Scheduled Import:**

```javascript
// Import from external source
const externalData = await fetchFromAPI()
await paperlyte.api.import.fromJSON(externalData)
```

### Custom Export Scripts

For advanced users who want to process their data:

**Export for Analysis:**

- Export with custom metadata
- Include usage statistics
- Generate reports from note data

---

## 🔒 Security and Privacy

### Export Security

**What's Included:**

- Note titles and content
- Creation and modification dates
- Formatting and structure
- Tags and organization data

**What's NOT Included:**

- No user identification data
- No tracking information
- No browser-specific data
- No usage analytics

### Import Security

**File Validation:**

- All imported files are scanned for malicious content
- HTML/JavaScript is sanitized
- File size limits prevent abuse
- Format validation ensures data integrity

**Privacy Protection:**

- Import process happens locally in your browser
- No data sent to external servers during import
- Imported files are not stored on Paperlyte servers

---

## 🆘 Troubleshooting Import/Export

### Export Issues

**Problem:** Export file is empty or corrupted

**Solutions:**

1. Try exporting in a different format
2. Export smaller batches instead of all notes
3. Check browser storage permissions
4. Ensure sufficient disk space

**Problem:** Export taking too long

**Solutions:**

1. Close other browser tabs to free memory
2. Export in smaller batches
3. Try a different format (JSON is fastest)
4. Restart browser and try again

### Import Issues

**Problem:** Import fails or stops partway

**Solutions:**

1. Check file format is supported
2. Verify file isn't corrupted (try opening in text editor)
3. Try importing smaller batches
4. Check for special characters or formatting issues

**Problem:** Imported notes look wrong

**Solutions:**

1. Check the source format was mapped correctly
2. Try importing as plain text first
3. Manually fix formatting after import
4. Contact support with sample file

### Format Compatibility

**Markdown Import Issues:**

- Check for non-standard markdown syntax
- Verify file encoding (should be UTF-8)
- Remove or escape special characters

**JSON Import Issues:**

- Validate JSON syntax using online validator
- Check for missing required fields
- Ensure proper date format

---

## 📞 Getting Help

### Support Resources

- **Documentation:** This guide and [troubleshooting guide](troubleshooting.md)
- **Email Support:** hello@paperlyte.com
- **Community:** Join our user forum (link coming soon)

### When Contacting Support

Include this information:

1. Browser and version
2. File format you're trying to import/export
3. Error messages (if any)
4. File size and number of notes
5. Steps you've already tried

---

## 🚀 Future Features

### Planned Enhancements

**Advanced Export Options:**

- Custom export templates
- Filtered exports by tags or content
- Scheduled automated backups
- Cloud storage integration

**Enhanced Import Features:**

- Real-time sync between devices
- Collaborative import/sharing
- Import from web clipper browser extension
- Integration with popular productivity tools

**Migration Tools:**

- One-click migration from major note apps
- Guided migration wizard
- Data validation and cleanup tools
- Migration progress tracking

---

**Remember:** Your data is valuable. Regular backups ensure you never lose your important notes. Start with a simple weekly backup routine and adjust based on how much you rely on Paperlyte for your daily work.\*\*

_Last updated: October 2025 | Feature implementation target: Q4 2025_
