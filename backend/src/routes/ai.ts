import { Router, Request, Response } from 'express';
import { getLLM } from '../services/llmService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All AI routes require auth
router.use(requireAuth);

// ─── POST /api/ai/summarize ──────────────────────────────────────────
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const prompt = `You are an intelligent email assistant. Analyze this email and provide a structured summary.

Email Details:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Date: ${email.receivedAt}
Body: ${(email.body || '').substring(0, 3000)}

Respond with a JSON object containing:
{
  "summary": "A concise 2-3 sentence summary of the email",
  "priority": "urgent|normal|low|spam",
  "sentiment": "positive|neutral|negative|urgent",
  "category": "work|personal|finance|shopping|newsletter|social|spam",
  "actionItems": ["list of action items if any"],
  "needsReply": true or false,
  "suggestedReply": "A brief suggested reply if needsReply is true, otherwise null"
}

Rules:
- "urgent" priority: deadlines, payment due, interviews, medical, legal
- "low" priority: newsletters, promotions, social notifications
- "spam": obvious spam or unwanted emails
- Keep summary under 100 words
- Action items should be specific and actionable
- Suggested reply should be professional and concise`;

    const llm = getLLM();
    const result = await llm.generate(prompt, { jsonMode: true });
    const parsed = JSON.parse(result);

    res.json({
      summary: parsed.summary || 'Unable to summarize',
      priority: parsed.priority || 'normal',
      sentiment: parsed.sentiment || 'neutral',
      category: parsed.category || 'personal',
      actionItems: parsed.actionItems || [],
      needsReply: parsed.needsReply || false,
      suggestedReply: parsed.suggestedReply || undefined,
    });
  } catch (error) {
    console.error('[AI] Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize email' });
  }
});

// ─── POST /api/ai/digest ────────────────────────────────────────────
router.post('/digest', async (req: Request, res: Response) => {
  try {
    const { summaries, emailCount } = req.body;
    if (!summaries || !emailCount) {
      res.status(400).json({ error: 'summaries and emailCount are required' });
      return;
    }

    const summaryList = summaries
      .map((s: any, i: number) => `${i + 1}. [${(s.priority || 'normal').toUpperCase()}] ${s.category || 'other'}: ${s.summary}`)
      .join('\n');

    const prompt = `You are an email assistant creating a daily digest. Here are today's email summaries:

Total emails: ${emailCount}
Urgent: ${summaries.filter((s: any) => s.priority === 'urgent').length}
Needs reply: ${summaries.filter((s: any) => s.needsReply).length}

Summaries:
${summaryList}

Create a brief, helpful daily digest that includes:
1. A one-line overview of the day
2. Top urgent items (if any)
3. Combined action items
4. What can be safely ignored

Keep it under 200 words. Be direct and helpful. Use bullet points.`;

    const llm = getLLM();
    const result = await llm.generate(prompt, { jsonMode: false });
    res.json({ digest: result });
  } catch (error) {
    console.error('[AI] Digest error:', error);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

// ─── POST /api/ai/smart-reply ────────────────────────────────────────
router.post('/smart-reply', async (req: Request, res: Response) => {
  try {
    const { email, tone = 'professional' } = req.body;
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const prompt = `Draft a ${tone} reply to this email:

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Body: ${(email.body || '').substring(0, 2000)}

Write a concise, ${tone} reply. Just the reply text, no subject line or greeting format. Keep it under 100 words.`;

    const llm = getLLM();
    const result = await llm.generate(prompt, { jsonMode: false });

    // Strip JSON wrapping if present
    let reply = result;
    try {
      reply = JSON.parse(result);
    } catch {
      // not JSON, use as-is
    }

    res.json({ reply });
  } catch (error) {
    console.error('[AI] Smart-reply error:', error);
    res.status(500).json({ error: 'Failed to generate reply' });
  }
});

// ─── POST /api/ai/chat ──────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, emails, conversationHistory = [] } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const emailSummaries = (emails || [])
      .slice(0, 50)
      .map((e: any, i: number) => {
        const date = new Date(e.receivedAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        const account = e.accountId && e.accountId !== 'gmail-primary' ? ` [${e.accountId}]` : '';
        const labels = (e.labels || [])
          .filter((l: string) => l.startsWith('CATEGORY_'))
          .map((l: string) => l.replace('CATEGORY_', '').toLowerCase())
          .join(', ');
        return `${i + 1}. From: ${e.from.name} <${e.from.email}> | Date: ${date} | Subject: ${e.subject}${account}${labels ? ` | Category: ${labels}` : ''}\n   Preview: ${(e.bodyPreview || '').substring(0, 150)}${e.isStarred ? ' ⭐' : ''}${!e.isRead ? ' [UNREAD]' : ''}${e.hasAttachments ? ' 📎' : ''}`;
      })
      .join('\n');

    const historyText = conversationHistory
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are MailMind AI, an intelligent email assistant. You have access to the user's recent emails and can answer questions about them.

IMPORTANT: Respond in plain text, NOT JSON. Be helpful, concise, and use formatting like bullet points and bold (**text**) where appropriate.

=== EMAIL CONTEXT (${(emails || []).length} emails from last 7 days) ===
${emailSummaries}

${historyText ? `=== CONVERSATION HISTORY ===\n${historyText}\n` : ''}
=== USER QUESTION ===
${message}

Answer the user's question based on the email data above. If they ask about specific emails, reference them by sender/subject. If they ask for analytics, compute them from the data. Be conversational and helpful. Keep responses under 300 words unless the user asks for details.`;

    const llm = getLLM();
    const result = await llm.generate(prompt, { jsonMode: false });
    res.json({ response: result });
  } catch (error) {
    console.error('[AI] Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// ─── GET /api/ai/config ─────────────────────────────────────────────
// Returns current LLM config (no secrets) — useful for UI display
router.get('/config', (_req: Request, res: Response) => {
  const llm = getLLM();
  res.json({
    provider: llm.name,
    model: llm.model,
  });
});

// ─── POST /api/ai/actions ────────────────────────────────────────────
// Generate smart action chips for an email
router.post('/actions', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'email is required' });
      return;
    }

    const prompt = `You are an email assistant. Analyze this email and suggest 2-4 quick actions the user can take.

Email:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Body: ${(email.body || email.bodyPreview || '').substring(0, 2000)}

Return a JSON array of action objects. Each action has:
- "id": unique short string (e.g. "accept", "decline", "reply_thanks")
- "label": short display text (2-4 words, e.g. "Accept Invite", "Pay Now")
- "emoji": one relevant emoji
- "type": one of "reply" | "archive" | "star" | "label" | "snooze" | "custom"
- "replyText": if type is "reply", include the suggested reply text (1-2 sentences). Otherwise omit.

Rules:
- For meeting invites: suggest "Accept", "Decline", "Propose New Time"
- For payment/bills: suggest "Pay Now", "Remind Later", "Mark as Paid"
- For newsletters: suggest "Read Later", "Unsubscribe", "Archive"
- For action requests: suggest "Reply OK", "Decline", "Delegate"
- For shipping/tracking: suggest "Track Package", "Archive"
- For social/notifications: suggest "View", "Mute", "Archive"
- Always include at least one "Archive" or "Mark Read" option
- Keep labels very short (2-4 words max)
- Return ONLY the JSON array, no wrapping object

Example:
[
  {"id":"accept","label":"Accept Invite","emoji":"✅","type":"reply","replyText":"Thanks, I'll be there!"},
  {"id":"decline","label":"Decline","emoji":"❌","type":"reply","replyText":"Sorry, I won't be able to make it."},
  {"id":"archive","label":"Archive","emoji":"📁","type":"archive"}
]`;

    const llm = getLLM();
    const result = await llm.generate(prompt, { jsonMode: true });
    let actions;
    try {
      const parsed = JSON.parse(result);
      actions = Array.isArray(parsed) ? parsed : parsed.actions || [];
    } catch {
      actions = [];
    }

    // Validate and sanitize
    actions = actions
      .filter((a: any) => a.id && a.label && a.type)
      .slice(0, 5)
      .map((a: any) => ({
        id: String(a.id),
        label: String(a.label).substring(0, 30),
        emoji: String(a.emoji || '⚡').substring(0, 2),
        type: ['reply', 'archive', 'star', 'label', 'snooze', 'custom'].includes(a.type) ? a.type : 'custom',
        ...(a.replyText ? { replyText: String(a.replyText).substring(0, 500) } : {}),
      }));

    res.json({ actions });
  } catch (error) {
    console.error('[AI] Actions error:', error);
    res.status(500).json({ error: 'Failed to generate actions' });
  }
});

export default router;
