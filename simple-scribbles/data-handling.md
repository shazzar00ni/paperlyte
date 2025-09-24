# Paperlyte Data Handling & Account Management

**Document Version:** 1.0  
**Last Updated:** September 2024  
**GDPR Compliance Status:** ✅ Compliant

## Data Processing Overview

### Current Data Processing (MVP)
- **Scope:** Minimal data collection, local-only storage
- **Legal Basis:** Legitimate interest, explicit consent for waitlist
- **Data Location:** User devices (localStorage) and EU-based email service

### Future Data Processing (Q4 2025+)
- **Scope:** Account management, encrypted note synchronization
- **Legal Basis:** Contract performance, explicit consent for enhanced features
- **Data Location:** EU data centers with GDPR-compliant cloud providers

## Data Categories & Retention

### Personal Data Inventory

| Data Type | Purpose | Legal Basis | Retention Period | Storage Location |
|-----------|---------|-------------|------------------|------------------|
| **Waitlist Email** | Product updates | Consent | Launch +1 year | EU email service |
| **Waitlist Name** | Personalization | Consent | Launch +1 year | EU email service |
| **Device Notes** | Core functionality | Legitimate interest | User-controlled | Local device |
| **Usage Analytics** | Service improvement | Legitimate interest | 2 years (anonymized) | Local device |
| **Account Email** (Future) | Authentication | Contract | Account lifetime | EU database |
| **Encrypted Notes** (Future) | Sync service | Contract | User-controlled | EU database |
| **Security Logs** (Future) | Security monitoring | Legitimate interest | 1 year | EU database |

### Data Minimization Principles
- Collect only data necessary for specific purposes
- Regular data purging of unnecessary information
- Anonymization of analytics data after collection
- User control over data sharing and processing

## User Rights Implementation

### Right to Access (Art. 15 GDPR)

**Current Implementation:**
- Waitlist data available via email request
- Response time: 7 days maximum
- Format: Human-readable summary + machine-readable JSON

**Future Implementation:**
- Self-service data access portal in user settings
- Real-time data export in multiple formats
- Complete activity history and account information

**Process:**
1. User requests data access via privacy@paperlyte.com
2. Identity verification using email confirmation
3. Data package preparation within 7 days
4. Secure delivery via encrypted email or secure portal

### Right to Rectification (Art. 16 GDPR)

**Current Implementation:**
- Email request to update waitlist information
- Manual processing within 5 business days

**Future Implementation:**
- Real-time profile editing in account settings
- Automatic sync across all connected devices
- Audit trail for all data modifications

**Process:**
1. User identifies incorrect or incomplete data
2. Correction request via app settings or email
3. Data verification and update within 2 business days
4. Confirmation notification to user

### Right to Erasure (Art. 17 GDPR)

**Current Implementation:**
```
Email Request Process:
1. Send email to privacy@paperlyte.com
2. Subject: "Delete My Data - [your email]"
3. Include: Email used for waitlist signup
4. Confirmation within 7 days
5. Complete removal from all systems
```

**Future Implementation:**
```
Self-Service Deletion:
1. Settings → Account → Delete Account
2. Download data export (optional)
3. Confirm deletion with password/2FA
4. 30-day grace period with account deactivation
5. Permanent deletion of all data
6. Confirmation email sent
```

**Technical Implementation:**
- Secure deletion using cryptographic erasure
- Database record removal with verification
- Backup system purging within 30 days
- Third-party service data removal coordination

### Right to Data Portability (Art. 20 GDPR)

**Current Data Export:**
- Waitlist information in JSON/CSV format
- Email delivery within 7 days

**Future Data Export:**
- **Notes:** Markdown, JSON, PDF, HTML formats
- **Account Data:** Complete profile and settings
- **Activity History:** Login history, device list
- **Analytics:** Personal usage statistics (if available)

**Export Formats:**
```json
{
  "account": {
    "email": "user@example.com",
    "created_date": "2025-01-01T00:00:00Z",
    "last_login": "2025-09-01T12:00:00Z"
  },
  "notes": [
    {
      "id": "note_123",
      "title": "Meeting Notes",
      "content": "# Meeting Notes\n\nDiscussed...",
      "created": "2025-08-01T10:00:00Z",
      "modified": "2025-08-01T11:30:00Z",
      "tags": ["work", "meeting"]
    }
  ],
  "settings": {
    "theme": "dark",
    "sync_enabled": true,
    "notifications": false
  }
}
```

### Right to Restrict Processing (Art. 18 GDPR)

**Implementation:**
- Account suspension without deletion
- Data processing restriction flags in database  
- Continued storage but no active processing
- User notification of restriction status

**Scenarios:**
- Disputed data accuracy during verification
- Unlawful processing pending legal resolution
- User objection pending legitimate interest assessment

### Right to Object (Art. 21 GDPR)

**Marketing Communications:**
- One-click unsubscribe in all emails
- Preference center for communication types
- Immediate opt-out processing

**Legitimate Interest Processing:**
- Formal objection process via privacy@paperlyte.com
- Balancing test documentation
- Processing cessation if no overriding legitimate grounds

## Account Deletion Procedures

### Immediate Deletion (Current)
```bash
# Process for waitlist removal
1. Email: privacy@paperlyte.com
2. Subject: "Delete My Data"
3. Body: Include email address used for signup
4. Response: Confirmation within 7 days
5. Verification: Email confirmation of deletion
```

### Future Account Deletion Process
```
User-Initiated Deletion:
1. Login to account
2. Navigate to Settings → Privacy → Delete Account
3. Review data export options
4. Confirm deletion with password + 2FA
5. 30-day deactivation period (optional recovery)
6. Permanent deletion after grace period
7. Confirmation email to registered address

Admin-Initiated Deletion (e.g., GDPR request):
1. Verify identity of requestor
2. Locate all associated data across systems
3. Export data if requested
4. Execute deletion across all databases
5. Verify deletion completion
6. Send confirmation to user
7. Update deletion log
```

### Technical Deletion Implementation

**Database Deletion:**
```sql
-- User account deletion with cascading
DELETE FROM user_accounts WHERE user_id = ?;
-- Triggers cascade deletion of:
-- - encrypted_notes
-- - user_settings  
-- - session_tokens
-- - audit_logs (anonymized after 30 days)
```

**Backup Deletion:**
- Automated purging from all backup systems
- Cryptographic key deletion for encrypted backups
- Third-party service coordination (email providers, etc.)
- Verification of complete data removal

**Audit Trail:**
- Deletion timestamp and method
- Verification of successful removal
- Compliance officer sign-off
- Retention of deletion record (anonymized)

## Data Export Procedures

### Current Export Process
1. **Request:** Email privacy@paperlyte.com with "Data Export Request"
2. **Verification:** Email address confirmation
3. **Processing:** Manual extraction within 7 days
4. **Delivery:** Secure email attachment or download link
5. **Format:** JSON for structured data, CSV for lists

### Future Self-Service Export
1. **Access:** Settings → Privacy → Export My Data
2. **Selection:** Choose data types and format preferences
3. **Generation:** Real-time data package creation
4. **Download:** Secure download with expiring link
5. **Notification:** Email confirmation of export completion

### Export Data Format Standards

**Structured Data (JSON):**
- Complete account information
- All notes with metadata
- Settings and preferences
- Activity history (if available)

**Readable Formats:**
- **PDF:** Formatted document with all notes
- **Markdown:** Individual .md files in ZIP archive
- **HTML:** Web-viewable format with navigation
- **CSV:** Tabular data for spreadsheet import

## Compliance Monitoring

### Regular Audits
- **Monthly:** Data retention policy compliance
- **Quarterly:** User rights request processing review
- **Annually:** Complete GDPR compliance assessment
- **Ad-hoc:** Response to regulatory changes

### Key Performance Indicators
- **Data Subject Request Response Time:** < 7 days (target: 2 days)
- **Account Deletion Completion:** < 30 days
- **Data Export Generation:** < 24 hours
- **Privacy Policy Updates:** Communicated within 30 days

### Documentation Requirements
- All data processing activities logged
- User consent records maintained
- Data transfer agreements with processors
- Regular compliance training records

## Contact Information

### Privacy Requests
- **Email:** privacy@paperlyte.com
- **Response Time:** Within 2 business days
- **Languages:** English (additional languages upon request)

### Data Protection Officer
- **Email:** dpo@paperlyte.com (when appointed)
- **Role:** Independent privacy oversight
- **Availability:** GDPR compliance consultation

### Supervisory Authority
Users have the right to lodge complaints with:
- **EU:** Local Data Protection Authority
- **UK:** Information Commissioner's Office (ICO)
- **US:** State Attorney General (for CCPA compliance)

---

**Compliance Statement:**
This document demonstrates Paperlyte's commitment to data protection rights and GDPR compliance. All procedures are designed to respect user privacy while enabling essential business functions. Regular reviews ensure continued compliance with evolving privacy regulations.

**Next Review:** December 2024  
**Document Owner:** Privacy Officer  
**Technical Owner:** Engineering Team