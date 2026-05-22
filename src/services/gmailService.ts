import { getAccessToken } from './authService';
import { Email } from '../types';
import { apiCall } from './apiClient';

async function getToken(overrideToken?: string): Promise<string> {
  const token = overrideToken || (await getAccessToken());
  if (!token) throw new Error('Not authenticated');
  return token;
}

export const fetchEmails = async (
  maxResults: number = 20,
  query: string = '',
  pageToken?: string,
  accountToken?: string
): Promise<{ emails: Email[]; nextPageToken?: string }> => {
  const token = await getToken(accountToken);
  return apiCall<{ emails: Email[]; nextPageToken?: string }>('/api/gmail/emails', {
    body: { maxResults, query, pageToken },
    token,
  });
};

export const fetchEmailsMultiAccount = async (
  accounts: { email: string; token: string }[],
  maxResults: number = 20
): Promise<{ emails: Email[]; accountEmails: Record<string, number> }> => {
  // Use the first account's token for auth header, pass all in body
  const authToken = accounts[0]?.token || (await getAccessToken()) || '';
  return apiCall<{ emails: Email[]; accountEmails: Record<string, number> }>('/api/gmail/emails/multi', {
    body: { accounts, maxResults },
    token: authToken,
  });
};

export const sendReply = async (
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
): Promise<boolean> => {
  try {
    const token = await getToken();
    await apiCall('/api/gmail/reply', {
      body: { threadId, to, subject, body, inReplyTo },
      token,
    });
    return true;
  } catch {
    return false;
  }
};

export const modifyEmail = async (
  messageId: string,
  addLabels: string[] = [],
  removeLabels: string[] = []
): Promise<boolean> => {
  try {
    const token = await getToken();
    await apiCall('/api/gmail/modify', {
      body: { messageId, addLabels, removeLabels },
      token,
    });
    return true;
  } catch {
    return false;
  }
};

export const markAsRead = (messageId: string) =>
  modifyEmail(messageId, [], ['UNREAD']);

export const archiveEmail = (messageId: string) =>
  modifyEmail(messageId, [], ['INBOX']);

export const starEmail = (messageId: string) =>
  modifyEmail(messageId, ['STARRED']);

export const unstarEmail = (messageId: string) =>
  modifyEmail(messageId, [], ['STARRED']);

export const trashEmail = (messageId: string) =>
  modifyEmail(messageId, ['TRASH']);
