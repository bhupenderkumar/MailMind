import { EmailPriority, EmailCategory } from '../types';

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

export const getPriorityLabel = (priority: EmailPriority): string => {
  const labels: Record<EmailPriority, string> = {
    urgent: '🔴 Urgent',
    normal: '🟡 Normal',
    low: '🟢 Low',
    spam: '🗑️ Spam',
  };
  return labels[priority];
};

export const getCategoryEmoji = (category: EmailCategory): string => {
  const emojis: Record<EmailCategory, string> = {
    work: '💼',
    personal: '👤',
    finance: '💰',
    shopping: '🛒',
    newsletter: '📰',
    social: '💬',
    spam: '🗑️',
  };
  return emojis[category];
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};
