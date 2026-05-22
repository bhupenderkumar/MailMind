# Email Summarizer AI — Architecture & Planning

## App Vision
An AI-powered email assistant that connects to all your email accounts (Gmail, Outlook, Yahoo, etc.), monitors incoming emails, summarizes them, extracts action items, and lets you take smart actions — all from one unified inbox.

---

## Phase 1: Gmail Only (MVP)
## Phase 2: Add Microsoft Outlook
## Phase 3: Add Yahoo, iCloud, Custom IMAP

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   MOBILE APP                         │
│              (Kotlin + Jetpack Compose)              │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Unified  │  │ Summary  │  │   Smart Actions   │  │
│  │  Inbox   │  │  View    │  │ (Reply/Archive/   │  │
│  │          │  │          │  │  Forward/Remind)  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │              │
│  ┌────┴──────────────┴─────────────────┴──────────┐  │
│  │            Local Database (Room/SQLite)         │  │
│  │  - Cached emails, summaries, action items      │  │
│  │  - Account tokens (encrypted)                  │  │
│  │  - User preferences                            │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
└───────────────────────┼──────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│                   BACKEND SERVER                      │
│              (Node.js or Python FastAPI)              │
│              Hosted on: Railway / Render              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │              API Gateway / Auth                  │  │
│  │  - JWT token management                         │  │
│  │  - Rate limiting                                │  │
│  │  - User management                              │  │
│  └──────────┬──────────────────────┬───────────────┘  │
│             │                      │                  │
│  ┌──────────▼──────────┐ ┌────────▼────────────────┐  │
│  │  Email Connectors   │ │   AI Summarization      │  │
│  │                     │ │   Service                │  │
│  │  ┌───────────────┐  │ │                          │  │
│  │  │ Gmail API     │  │ │  - Gemini 1.5 Flash     │  │
│  │  │ (OAuth2)      │  │ │  - Summarize emails     │  │
│  │  └───────────────┘  │ │  - Extract action items  │  │
│  │  ┌───────────────┐  │ │  - Draft smart replies   │  │
│  │  │ Microsoft     │  │ │  - Priority scoring      │  │
│  │  │ Graph API     │  │ │  - Language detection    │  │
│  │  │ (OAuth2)      │  │ │                          │  │
│  │  └───────────────┘  │ └──────────────────────────┘  │
│  │  ┌───────────────┐  │                              │
│  │  │ Yahoo/IMAP    │  │ ┌──────────────────────────┐  │
│  │  │ (App Password)│  │ │   Push Notification      │  │
│  │  └───────────────┘  │ │   Service (FCM)          │  │
│  │  ┌───────────────┐  │ │  - New email alerts      │  │
│  │  │ Custom IMAP   │  │ │  - Summary ready         │  │
│  │  │ (Any provider)│  │ │  - Action reminders      │  │
│  │  └───────────────┘  │ └──────────────────────────┘  │
│  └─────────────────────┘                              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Database (PostgreSQL)               │  │
│  │  - User accounts & preferences                  │  │
│  │  - OAuth tokens (encrypted AES-256)             │  │
│  │  - Email metadata & summaries cache             │  │
│  │  - Action items & reminders                     │  │
│  │  - Subscription status                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Why We Need a Backend Server

| Reason | Explanation |
|---|---|
| **OAuth Token Security** | Gmail/Microsoft OAuth tokens should NOT be stored only on device. Backend handles token refresh securely |
| **Background Email Polling** | Server checks for new emails even when app is closed, sends push notification |
| **Multi-device Sync** | User can use app on multiple phones/tablets with same account |
| **AI API Key Protection** | Gemini API key stays on server, not embedded in app (security) |
| **Rate Limiting** | Prevent abuse, manage free vs premium users |
| **Email Processing** | Heavy summarization can run on server, saving phone battery |
| **Subscription Management** | Verify Google Play purchases server-side |

### Backend Cost (Starting)

| Service | Free Tier | Enough For |
|---|---|---|
| **Railway.app** | $5 free credit/month | ~1,000 users |
| **Render.com** | 750 hours free/month | MVP stage |
| **Supabase** (Database) | 500MB free, 50K auth users | ~10,000 users |
| **Gemini API** | 1,500 requests/day free | ~500 daily active users |
| **Firebase (FCM)** | Unlimited push notifications | Unlimited |

**Total server cost at launch: $0**

---

## Email Provider Integration Plan

### Phase 1: Gmail (MVP Launch)

```
Authentication: Google Sign-In SDK → OAuth2 access token
API: Gmail API (REST)
Permissions Requested:
  - gmail.readonly     → Read emails
  - gmail.send         → Send replies
  - gmail.modify       → Archive, label, mark read
  - gmail.labels       → Create/manage labels
Webhook: Gmail Push Notifications (Pub/Sub) → Server gets notified on new email
```

### Phase 2: Microsoft Outlook / Office 365

```
Authentication: MSAL (Microsoft Authentication Library) → OAuth2
API: Microsoft Graph API
Permissions:
  - Mail.Read
  - Mail.Send
  - Mail.ReadWrite
Webhook: Microsoft Graph Subscriptions → Server gets notified on new email
```

### Phase 3: Yahoo Mail

```
Authentication: Yahoo OAuth2
API: IMAP (Yahoo doesn't have a modern REST API)
Connection: IMAP with OAuth2 or App Password
Polling: Server checks every 2-5 minutes via IMAP IDLE
```

### Phase 4: Any Custom IMAP Provider

```
Authentication: IMAP username + App Password (encrypted)
API: IMAP protocol
Supports: Zoho, ProtonMail Bridge, company email, any IMAP server
Polling: Server checks every 2-5 minutes via IMAP IDLE
```

---

## Database Schema (Core Tables)

```
users
├── id (UUID)
├── name
├── email (primary)
├── created_at
├── subscription_tier (free / premium)
├── subscription_expires_at
└── fcm_token (for push notifications)

email_accounts
├── id (UUID)
├── user_id → users.id
├── provider (gmail / outlook / yahoo / imap)
├── email_address
├── access_token (encrypted AES-256)
├── refresh_token (encrypted AES-256)
├── token_expires_at
├── imap_host (for custom IMAP)
├── imap_port
├── is_active (boolean)
└── last_synced_at

emails
├── id (UUID)
├── account_id → email_accounts.id
├── provider_email_id (Gmail/Outlook message ID)
├── from_name
├── from_email
├── to_emails (JSON array)
├── subject
├── body_preview (first 500 chars)
├── received_at
├── is_read (boolean)
├── is_starred (boolean)
├── labels (JSON array)
├── has_attachments (boolean)
└── raw_size_bytes

summaries
├── id (UUID)
├── email_id → emails.id
├── summary_text (AI-generated summary)
├── priority (urgent / normal / low / spam)
├── sentiment (positive / neutral / negative / urgent)
├── action_items (JSON array)
├── suggested_reply (AI-drafted reply)
├── language_detected
├── created_at
└── model_used (gemini-1.5-flash)

reminders
├── id (UUID)
├── user_id → users.id
├── email_id → emails.id
├── remind_at (datetime)
├── note
├── is_completed (boolean)
└── created_at

daily_digests
├── id (UUID)
├── user_id → users.id
├── digest_date (date)
├── total_emails_received
├── urgent_count
├── summary_text (AI daily digest)
├── top_action_items (JSON array)
└── created_at
```

---

## App Screens (Mobile)

### Screen 1: Welcome / Sign In
- "Sign in with Google" button (Phase 1)
- "Sign in with Microsoft" button (Phase 2 — grayed out with "Coming Soon")
- "Add IMAP Account" (Phase 3 — grayed out)

### Screen 2: Unified Inbox
- All emails from all accounts in one list
- Color-coded by account (Gmail = red, Outlook = blue, etc.)
- Each email shows:
  - Sender name + photo
  - Subject line
  - AI Summary (2-3 lines)
  - Priority badge (🔴 Urgent, 🟡 Normal, 🟢 Low, 🗑️ Skip)
  - Time received
- Filter tabs: All | Urgent | Action Required | Newsletters | Spam

### Screen 3: Email Detail + Summary
- Full AI summary
- Key points (bullet list)
- Action items extracted
- Original email (expandable)
- Smart action buttons:
  - ✉️ AI Reply (generates draft, user edits & sends)
  - 📁 Archive
  - 🏷️ Label
  - ⏰ Remind Me
  - ➡️ Forward Summary
  - 🗑️ Delete

### Screen 4: Daily Digest
- "Today: You received 47 emails"
- "3 need your attention"
- "Key highlights from today..."
- Action items across all emails
- Comparison with yesterday

### Screen 5: Settings
- Manage email accounts (add/remove)
- AI preferences:
  - Summary length (short / medium / detailed)
  - Language preference (English / Hindi / both)
  - Auto-categorize (on/off)
- Notification preferences:
  - Notify on urgent emails only
  - Daily digest time (default: 8 PM)
- Subscription management
- Privacy controls

### Screen 6: Smart Reply Composer
- AI-generated reply draft
- User can edit
- Tone selector: Professional / Casual / Friendly / Formal
- Send button
- "Regenerate" button for new draft

---

## AI Summarization Prompt Design

### Email Summary Prompt
```
You are an email assistant. Summarize this email concisely.

Email:
From: {sender}
Subject: {subject}
Body: {body}

Respond in JSON:
{
  "summary": "2-3 sentence summary",
  "priority": "urgent|normal|low|spam",
  "sentiment": "positive|neutral|negative|urgent",
  "action_items": ["action 1", "action 2"],
  "category": "work|personal|finance|shopping|newsletter|social|spam",
  "needs_reply": true/false,
  "suggested_reply": "short reply draft if needs_reply is true"
}
```

### Daily Digest Prompt
```
You are an email assistant. Create a daily digest from these email summaries.

Today's emails:
{list of summaries}

Create a brief daily report with:
1. Overview (total emails, categories breakdown)
2. Top 3 urgent items
3. All action items (consolidated)
4. Emails that can be safely ignored
```

---

## Monetization Plan

### Free Tier
- 1 email account (Gmail only)
- 10 email summaries per day
- Basic priority sorting
- No smart replies
- Ads (banner, non-intrusive)

### Premium — ₹249/month ($2.99)
- Up to 5 email accounts (Gmail + Outlook + Yahoo + IMAP)
- Unlimited summaries
- AI smart replies
- Daily digest
- Reminders
- Hindi/regional language summaries
- No ads
- Priority customer support

### Premium Annual — ₹1,999/year ($23.99) — Save 33%

---

## Development Phases & Timeline

### Phase 1: MVP (Week 1-2) — Gmail Only
- [ ] Android project setup (Kotlin + Jetpack Compose)
- [ ] Google Sign-In integration
- [ ] Gmail API — fetch emails
- [ ] Backend server setup (Node.js + Supabase)
- [ ] Gemini API integration for summarization
- [ ] Unified inbox screen
- [ ] Email detail + summary screen
- [ ] Basic settings screen
- [ ] AdMob integration (free tier)

### Phase 2: Smart Features (Week 3-4)
- [ ] AI smart reply drafting
- [ ] Action items extraction
- [ ] Daily digest generation
- [ ] Push notifications (FCM) for urgent emails
- [ ] Reminder/snooze feature
- [ ] Gmail push notifications (Pub/Sub)

### Phase 3: Multi-Account (Week 5-6)
- [ ] Microsoft Outlook integration (Graph API)
- [ ] Yahoo Mail integration (IMAP)
- [ ] Custom IMAP account support
- [ ] Unified inbox across all accounts
- [ ] Account-specific color coding

### Phase 4: Monetization & Polish (Week 7-8)
- [ ] Google Play Billing (subscription)
- [ ] Premium feature gating
- [ ] Hindi language summary support
- [ ] Onboarding flow
- [ ] Play Store listing + ASO
- [ ] Privacy policy page
- [ ] Google OAuth verification submission

---

## Tech Stack Summary

| Layer | Technology | Cost |
|---|---|---|
| **Mobile App** | Kotlin + Jetpack Compose + Material 3 | Free |
| **Local DB** | Room (SQLite) | Free |
| **Auth** | Google Sign-In SDK, MSAL | Free |
| **Backend** | Node.js + Express OR Python FastAPI | Free |
| **Server Hosting** | Railway.app / Render.com | Free tier |
| **Database** | Supabase (PostgreSQL) | Free tier |
| **AI/LLM** | Google Gemini 1.5 Flash API | Free (1,500 req/day) |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Free |
| **Email APIs** | Gmail API, Microsoft Graph API | Free |
| **Ads** | Google AdMob | Earns money |
| **Subscriptions** | Google Play Billing Library | 15% Google cut |
| **Analytics** | Firebase Analytics | Free |
| **Crash Reporting** | Firebase Crashlytics | Free |

---

## Security Requirements

- All OAuth tokens encrypted with AES-256 before storing in database
- Backend API authenticated with JWT tokens
- HTTPS only — all API calls over TLS
- Email body content is NOT stored permanently — only metadata + AI summary
- User can delete all their data (GDPR/privacy compliance)
- Gemini API receives email content for summarization but does not store it
- No email content is shared with third parties
- Rate limiting on all API endpoints
- Input sanitization to prevent injection attacks

---

## Play Store Compliance

| Requirement | Status |
|---|---|
| Privacy Policy URL | Required — must explain email data usage |
| Data Safety Section | Must declare: email access, cloud processing |
| Google OAuth Verification | Required — submit for review (2-6 weeks) |
| Sensitive Permissions | gmail.readonly, gmail.send — requires justification |
| Content Rating | Everyone |
| Target API Level | Latest (Android 15+) |

---

## Future Additions (Post-Launch)

- [ ] iOS version (using Kotlin Multiplatform or Swift)
- [ ] Web dashboard
- [ ] Calendar integration (auto-detect meeting invites)
- [ ] WhatsApp/Telegram integration for forwarding summaries
- [ ] Team/shared inbox features
- [ ] Email templates library
- [ ] Attachment preview and summarization (PDF, docs)
- [ ] Voice command: "What urgent emails do I have?"
- [ ] Wear OS widget for quick summary glance
