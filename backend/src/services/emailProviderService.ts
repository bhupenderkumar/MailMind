/**
 * Email Provider Abstraction
 * ─────────────────────────────────────────────────
 * Same pattern as LLM providers — add a new provider
 * by implementing EmailProvider and registering it
 * in the factory.  Swap via EMAIL_PROVIDER env var.
 */

// ─── Common interfaces ──────────────────────────────────────────────

export interface EmailMessage {
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

export interface FetchResult {
  emails: EmailMessage[];
  nextPageToken?: string;
}

export interface EmailProvider {
  readonly name: string;

  fetchEmails(
    accessToken: string,
    maxResults?: number,
    query?: string,
    pageToken?: string
  ): Promise<FetchResult>;

  sendReply(
    accessToken: string,
    threadId: string,
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string
  ): Promise<boolean>;

  modifyEmail(
    accessToken: string,
    messageId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<boolean>;
}

// ─── Gmail Provider ──────────────────────────────────────────────────

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

function gmailHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

class GmailEmailProvider implements EmailProvider {
  readonly name = 'gmail';

  async fetchEmails(
    accessToken: string,
    maxResults = 20,
    query = '',
    pageToken?: string
  ): Promise<FetchResult> {
    const headers = gmailHeaders(accessToken);
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      ...(query && { q: query }),
      ...(pageToken && { pageToken }),
    });

    const listRes = await fetch(`${GMAIL_API}/messages?${params}`, { headers });
    if (!listRes.ok) throw new Error(`Gmail list error ${listRes.status}`);
    const listData = await listRes.json();

    if (!listData.messages?.length) return { emails: [] };

    const emails = (
      await Promise.all(
        listData.messages.map((m: { id: string }) => this.fetchDetail(m.id, headers))
      )
    ).filter((e): e is EmailMessage => e !== null);

    return { emails, nextPageToken: listData.nextPageToken };
  }

  async sendReply(
    accessToken: string,
    threadId: string,
    to: string,
    subject: string,
    body: string,
    inReplyTo?: string
  ): Promise<boolean> {
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

    const res = await fetch(`${GMAIL_API}/messages/send`, {
      method: 'POST',
      headers: gmailHeaders(accessToken),
      body: JSON.stringify({ raw: encodedMessage, threadId }),
    });
    return res.ok;
  }

  async modifyEmail(
    accessToken: string,
    messageId: string,
    addLabels: string[] = [],
    removeLabels: string[] = []
  ): Promise<boolean> {
    const res = await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
      method: 'POST',
      headers: gmailHeaders(accessToken),
      body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
    });
    return res.ok;
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private async fetchDetail(
    messageId: string,
    headers: Record<string, string>
  ): Promise<EmailMessage | null> {
    try {
      const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, { headers });
      if (!res.ok) return null;
      return this.parseMessage(await res.json());
    } catch {
      return null;
    }
  }

  private parseMessage(data: any): EmailMessage {
    const hdrs = data.payload?.headers || [];
    const h = (name: string) =>
      hdrs.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const fromRaw = h('From');
    const m = fromRaw.match(/^(.+?)\s*<(.+?)>$/) || ['', fromRaw, fromRaw];

    return {
      id: data.id,
      accountId: 'gmail-primary',
      from: { name: m[1]?.replace(/"/g, '').trim() || fromRaw, email: m[2] || fromRaw },
      to: h('To').split(',').map((e: string) => e.trim()),
      subject: h('Subject') || '(No Subject)',
      bodyPreview: data.snippet || '',
      body: this.extractBody(data.payload),
      receivedAt: new Date(parseInt(data.internalDate, 10)).toISOString(),
      isRead: !data.labelIds?.includes('UNREAD'),
      isStarred: data.labelIds?.includes('STARRED') || false,
      labels: data.labelIds || [],
      hasAttachments: data.payload?.parts?.some((p: any) => p.filename?.length > 0) || false,
      threadId: data.threadId,
    };
  }

  private extractBody(payload: any): string {
    if (!payload) return '';
    if (payload.body?.data) return this.decode64(payload.body.data);
    if (payload.parts) {
      const txt = payload.parts.find((p: any) => p.mimeType === 'text/plain');
      if (txt?.body?.data) return this.decode64(txt.body.data);
      const htm = payload.parts.find((p: any) => p.mimeType === 'text/html');
      if (htm?.body?.data) return this.stripHtml(this.decode64(htm.body.data));
      for (const part of payload.parts) {
        const body = this.extractBody(part);
        if (body) return body;
      }
    }
    return '';
  }

  private decode64(data: string): string {
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch {
      return '';
    }
  }

  private stripHtml(html: string): string {
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
}

// ─── Outlook Provider (placeholder) ─────────────────────────────────

class OutlookEmailProvider implements EmailProvider {
  readonly name = 'outlook';

  async fetchEmails(
    accessToken: string,
    maxResults = 20,
    query = '',
    _pageToken?: string
  ): Promise<FetchResult> {
    // Microsoft Graph API
    const params = new URLSearchParams({
      $top: maxResults.toString(),
      $orderby: 'receivedDateTime desc',
      $select: 'id,from,toRecipients,subject,bodyPreview,body,receivedDateTime,isRead,flag,hasAttachments,conversationId,categories',
      ...(query && { $search: `"${query}"` }),
    });

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Outlook error ${res.status}`);
    const data = await res.json();

    const emails: EmailMessage[] = (data.value || []).map((msg: any) => ({
      id: msg.id,
      accountId: 'outlook-primary',
      from: {
        name: msg.from?.emailAddress?.name || '',
        email: msg.from?.emailAddress?.address || '',
      },
      to: (msg.toRecipients || []).map((r: any) => r.emailAddress?.address || ''),
      subject: msg.subject || '(No Subject)',
      bodyPreview: msg.bodyPreview || '',
      body: msg.body?.content || '',
      receivedAt: msg.receivedDateTime || new Date().toISOString(),
      isRead: msg.isRead || false,
      isStarred: msg.flag?.flagStatus === 'flagged',
      labels: msg.categories || [],
      hasAttachments: msg.hasAttachments || false,
      threadId: msg.conversationId,
    }));

    return { emails, nextPageToken: data['@odata.nextLink'] };
  }

  async sendReply(
    accessToken: string,
    _threadId: string,
    to: string,
    subject: string,
    body: string,
  ): Promise<boolean> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'Text', content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });
    return res.ok;
  }

  async modifyEmail(
    accessToken: string,
    messageId: string,
    addLabels: string[] = [],
    removeLabels: string[] = []
  ): Promise<boolean> {
    const patch: any = {};
    if (removeLabels.includes('UNREAD')) patch.isRead = true;
    if (addLabels.includes('STARRED')) patch.flag = { flagStatus: 'flagged' };
    if (removeLabels.includes('STARRED')) patch.flag = { flagStatus: 'notFlagged' };

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return res.ok;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────

const providers: Record<string, EmailProvider> = {
  gmail: new GmailEmailProvider(),
  outlook: new OutlookEmailProvider(),
};

export function getEmailProvider(name: string = 'gmail'): EmailProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown email provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  return provider;
}

/** Helper: fetch from multiple accounts (any provider) */
export async function fetchEmailsMultiAccount(
  accounts: { email: string; token: string; provider?: string }[],
  maxResults: number = 20,
  query: string = ''
): Promise<{ emails: EmailMessage[]; accountEmails: Record<string, number> }> {
  const allEmails: EmailMessage[] = [];
  const accountEmails: Record<string, number> = {};

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const providerName = account.provider || 'gmail';
      const ep = getEmailProvider(providerName);
      const { emails } = await ep.fetchEmails(account.token, maxResults, query);
      const tagged = emails.map((e) => ({ ...e, accountId: account.email }));
      return { email: account.email, emails: tagged };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allEmails.push(...r.value.emails);
      accountEmails[r.value.email] = r.value.emails.length;
    }
  }

  allEmails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  return { emails: allEmails, accountEmails };
}
