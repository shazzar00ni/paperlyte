# 📣 In-App Feedback & User Interview System

## Overview

Paperlyte's feedback system enables users to provide in-app feedback and schedule user interviews, helping drive product development with real user insights.

---

## 🎯 Features

### Feedback Collection

- **Multiple Feedback Types**:
  - 🐛 Bug Reports
  - 💡 Feature Requests
  - ✨ Improvements
  - 💬 Other

- **Optional Contact Information**:
  - Users can optionally provide name and email
  - Privacy-first approach - no required personal data
- **Automatic Context Capture**:
  - User agent for browser/device info
  - Current URL for context
  - Timestamp for tracking

### User Interview Scheduling

- **Flexible Availability**:
  - Morning, Afternoon, Evening, or Flexible time slots
  - Multiple day selection
  - Automatic timezone detection

- **Topic Selection**:
  - Product feedback
  - Feature requests
  - User experience
  - Pain points
  - Workflow integration
  - Other

- **Additional Notes**:
  - Optional field for special requests or constraints

---

## 🏗️ Architecture

### Data Storage

The system uses a service abstraction layer for future API migration:

```typescript
// Current: IndexedDB with localStorage fallback
// Future (Q4 2025): API-based with real-time sync

dataService.addFeedback(...)
dataService.scheduleInterview(...)
```

### Components

1. **FeedbackModal** (`src/components/FeedbackModal.tsx`)
   - Modal dialog for collecting feedback
   - Form validation and submission
   - Success state handling

2. **InterviewScheduleModal** (`src/components/InterviewScheduleModal.tsx`)
   - Interview scheduling form
   - Day and topic multi-select
   - Timezone auto-detection

3. **FeedbackButton** (`src/components/FeedbackButton.tsx`)
   - Reusable button component
   - Configurable as fixed floating button or inline
   - Opens feedback modal on click

### Data Types

```typescript
// Feedback Entry
interface FeedbackEntry {
  id: string
  type: 'bug' | 'feature' | 'improvement' | 'other'
  message: string
  email?: string
  name?: string
  userAgent?: string
  url?: string
  createdAt: string
  status: 'new' | 'in_review' | 'addressed' | 'dismissed'
}

// Interview Request
interface InterviewRequest {
  id: string
  name: string
  email: string
  availability: 'morning' | 'afternoon' | 'evening' | 'flexible'
  preferredDays: string[]
  timezone: string
  topics: string[]
  additionalNotes?: string
  createdAt: string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
}
```

---

## 📊 Analytics Tracking

All user interactions are tracked via PostHog:

```typescript
// Feedback events
trackFeedbackEvent('view')
trackFeedbackEvent('submit', { type, hasEmail, messageLength })
trackFeedbackEvent('cancel')

// Interview events
trackInterviewEvent('view')
trackInterviewEvent('schedule', { availability, daysCount, topicsCount })
trackInterviewEvent('cancel')
```

---

## 🎨 UI/UX Integration

### Landing Page

- **User Engagement Section**: Dedicated section with two cards
  - Feedback card with "Give Feedback" CTA
  - Interview card with "Schedule Interview" CTA

### Note Editor

- **Fixed Floating Button**: Bottom-right floating action button
  - Always accessible while editing notes
  - Opens feedback modal on click

### Footer

- **Feedback Links**: New "Feedback" section with:
  - "Give Feedback" link
  - "User Interview" link

---

## 🧪 Testing

Comprehensive test suites ensure reliability:

### FeedbackModal Tests (9 tests)

- ✅ Render states (open/closed)
- ✅ Form validation (message length, email format)
- ✅ Submission handling (success/error)
- ✅ Optional fields handling
- ✅ Loading states

### InterviewScheduleModal Tests (11 tests)

- ✅ Render states
- ✅ Required fields validation
- ✅ Email format validation
- ✅ Day and topic selection
- ✅ Multi-select toggles
- ✅ Submission with optional notes
- ✅ Error handling

Run tests:

```bash
npm test -- src/components/__tests__/FeedbackModal.test.tsx
npm test -- src/components/__tests__/InterviewScheduleModal.test.tsx
```

---

## 🚀 Usage Examples

### Adding Feedback Button to a Page

```tsx
import FeedbackButton from '../components/FeedbackButton'

function MyPage() {
  return (
    <div>
      {/* Fixed floating button (default) */}
      <FeedbackButton position='fixed' />

      {/* Inline button */}
      <FeedbackButton position='inline' className='my-custom-class' />
    </div>
  )
}
```

### Opening Modals Programmatically

```tsx
import { useState } from 'react'
import FeedbackModal from '../components/FeedbackModal'
import InterviewScheduleModal from '../components/InterviewScheduleModal'

function MyComponent() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isInterviewOpen, setIsInterviewOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsFeedbackOpen(true)}>Feedback</button>
      <button onClick={() => setIsInterviewOpen(true)}>Interview</button>

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
      <InterviewScheduleModal
        isOpen={isInterviewOpen}
        onClose={() => setIsInterviewOpen(false)}
      />
    </>
  )
}
```

---

## 📈 Admin Dashboard (Coming Soon)

Future enhancement will include an admin dashboard to:

- View all feedback entries
- Filter by type and status
- View interview requests
- Update statuses
- Export data for analysis

---

## 🔄 Future API Migration (Q4 2025)

Current implementation uses IndexedDB for data persistence. The migration plan:

### Current

```typescript
// Client-side storage with IndexedDB
await dataService.addFeedback(feedback)
await dataService.getFeedbackEntries()
```

### Future

```typescript
// API endpoints
POST /api/feedback
GET /api/feedback (admin only)
POST /api/interviews
GET /api/interviews (admin only)
```

The data service abstraction ensures zero component changes during migration.

---

## 🎯 Success Metrics

Track these metrics via PostHog:

1. **Feedback Submission Rate**
   - Views vs submissions
   - Types of feedback submitted
   - Email opt-in rate

2. **Interview Request Rate**
   - Views vs requests
   - Availability preferences
   - Popular discussion topics

3. **User Engagement**
   - Time to first feedback
   - Feedback frequency per user
   - Interview completion rate

---

## 🔒 Privacy Considerations

- **No Required Personal Data**: Users can submit feedback anonymously
- **Optional Contact Info**: Email/name only for follow-up
- **Transparent Purpose**: Clear messaging about how data is used
- **User Control**: Easy opt-out and data deletion (future feature)

---

## 📝 Best Practices

### For Product Teams

1. **Review Feedback Regularly**: Check new submissions daily
2. **Respond Promptly**: Reach out to users who provided contact info
3. **Track Trends**: Look for patterns in feature requests and pain points
4. **Close the Loop**: Update users on implemented feedback

### For Developers

1. **Monitor Analytics**: Track feedback submission patterns
2. **Error Handling**: Ensure graceful failures with user-friendly messages
3. **Testing**: Run tests before deploying changes
4. **Accessibility**: Maintain WCAG compliance in all modals

---

## 🛠️ Troubleshooting

### Common Issues

#### Feedback not submitting

- Check IndexedDB availability in browser
- Verify network connectivity (future API version)
- Check browser console for errors

#### Modal not opening

- Verify component is imported correctly
- Check state management in parent component
- Ensure CSS classes are loaded

#### Tests failing

- Clear test cache: `npm test -- --clearCache`
- Check mock implementations
- Verify all dependencies installed

---

## 📞 Support

For questions or issues with the feedback system:

- Check GitHub issues
- Review test files for usage examples
- Contact the development team

---

**Last Updated**: 2025-10-11  
**Version**: 1.0  
**Maintained by**: Paperlyte Development Team
