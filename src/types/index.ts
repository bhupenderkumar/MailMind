export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'imap';

export type EmailPriority = 'urgent' | 'normal' | 'low' | 'spam';

export type EmailSentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

export type EmailCategory =
  | 'work'
  | 'personal'
  | 'finance'
  | 'shopping'
  | 'newsletter'
  | 'social'
  | 'spam';

export interface EmailAccount {
  id: string;
  provider: EmailProvider;
  email: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  lastSyncedAt?: string;
}

export interface Email {
  id: string;
  accountId: string;
  providerId: string;
  from: {
    name: string;
    email: string;
  };
  to: string[];
  subject: string;
  bodyPreview: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  hasAttachments: boolean;
  threadId?: string;
}

export interface EmailSummary {
  id: string;
  emailId: string;
  summary: string;
  priority: EmailPriority;
  sentiment: EmailSentiment;
  category: EmailCategory;
  actionItems: string[];
  needsReply: boolean;
  suggestedReply?: string;
  languageDetected: string;
  createdAt: string;
}

export interface EmailWithSummary extends Email {
  summary?: EmailSummary;
}

export interface DailyDigest {
  id: string;
  date: string;
  totalEmails: number;
  urgentCount: number;
  summaryText: string;
  topActionItems: string[];
  categories: Record<EmailCategory, number>;
}

export interface UserSettings {
  summaryLength: 'short' | 'medium' | 'detailed';
  language: 'english' | 'hindi' | 'both';
  autoSummarize: boolean;
  digestTime: string; // e.g., "20:00"
  notifyUrgentOnly: boolean;
}

export interface AIResponse {
  summary: string;
  priority: EmailPriority;
  sentiment: EmailSentiment;
  category: EmailCategory;
  actionItems: string[];
  needsReply: boolean;
  suggestedReply?: string;
}

export type ActionType = 'reply' | 'archive' | 'star' | 'label' | 'snooze' | 'custom';

export interface EmailAction {
  id: string;
  label: string;
  emoji: string;
  type: ActionType;
  replyText?: string;
}
