const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

function getHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export interface EmailData {
  id: string;
  accountId: string;
  from: { name: string; email: string };
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

export async function fetchEmails(
  accessToken: string,
  maxResults: number = 20,
  query: string = '',
  pageToken?: string
): Promise<{ emails: EmailData[]; nextPageToken?: string }> {
  const headers = getHeaders(accessToken);
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    ...(query && { q: query }),
    ...(pageToken && { pageToken }),
  });

  const listResponse = await fetch(`${GMAIL_API_BASE}/messages?${params}`, { headers });
  if (!listResponse.ok) {
    const err = await listResponse.json().catch(() => ({}));
    throw new Error(`Gmail list error ${listResponse.status}: ${JSON.stringify(err)}`);
  }

  const listData: any = await listResponse.json();
  if (!listData.messages || listData.messages.length === 0) {
    return { emails: [] };
  }

  const emailPromises = listData.messages.map((msg: { id: string }) =>
    fetchEmailDetail(msg.id, headers)
  );
  const emails = (await Promise.all(emailPromises)).filter((e: any): e is EmailData => e !== null);

  return { emails, nextPageToken: listData.nextPageToken };
}

export async function fetchEmailsMultiAccount(
  accounts: { email: string; token: string }[],
  maxResults: number = 20,
  query: string = ''
): Promise<{ emails: EmailData[]; accountEmails: Record<string, number> }> {
  const allEmails: EmailData[] = [];
  const accountEmails: Record<string, number> = {};

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const { emails } = await fetchEmails(account.token, maxResults, query);
      const tagged = emails.map((e) => ({ ...e, accountId: account.email }));
      return { email: account.email, emails: tagged };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEmails.push(...result.value.emails);
      accountEmails[result.value.email] = result.value.emails.length;
    }
  }

  allEmails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  return { emails: allEmails, accountEmails };
}

export async function sendReply(
  accessToken: string,
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
): Promise<boolean> {
  const headers = getHeaders(accessToken);
  const rawSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${rawSubject}`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ raw: encodedMessage, threadId }),
  });

  return response.ok;
}

export async function modifyEmail(
  accessToken: string,
  messageId: string,
  addLabels: string[] = [],
  removeLabels: string[] = []
): Promise<boolean> {
  const headers = getHeaders(accessToken);
  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
  });
  return response.ok;
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function fetchEmailDetail(
  messageId: string,
  headers: Record<string, string>
): Promise<EmailData | null> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}?format=full`, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    return parseGmailMessage(data);
  } catch {
    return null;
  }
}

function parseGmailMessage(data: any): EmailData {
  const hdrs = data.payload?.headers || [];
  const getHeader = (name: string) =>
    hdrs.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const fromRaw = getHeader('From');
  const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/) || ['', fromRaw, fromRaw];

  return {
    id: data.id,
    accountId: 'gmail-primary',
    from: {
      name: fromMatch[1]?.replace(/"/g, '').trim() || fromRaw,
      email: fromMatch[2] || fromRaw,
    },
    to: getHeader('To').split(',').map((e: string) => e.trim()),
    subject: getHeader('Subject') || '(No Subject)',
    bodyPreview: data.snippet || '',
    body: extractBody(data.payload),
    receivedAt: new Date(parseInt(data.internalDate, 10)).toISOString(),
    isRead: !data.labelIds?.includes('UNREAD'),
    isStarred: data.labelIds?.includes('STARRED') || false,
    labels: data.labelIds || [],
    hasAttachments: data.payload?.parts?.some((p: any) => p.filename && p.filename.length > 0) || false,
    threadId: data.threadId,
  };
}

function extractBody(payload: any): string {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) return stripHtml(decodeBase64Url(htmlPart.body.data));
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }
  return '';
}

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
