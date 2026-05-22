import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getEmailProvider, fetchEmailsMultiAccount } from '../services/emailProviderService';

const router = Router();

// All email routes require the user's OAuth token
router.use(requireAuth);

// ─── POST /api/gmail/emails ─────────────────────────────────────────
router.post('/emails', async (req: Request, res: Response) => {
  try {
    const token = (req as any).accessToken;
    const { maxResults = 20, query = '', pageToken, provider = 'gmail' } = req.body;

    const ep = getEmailProvider(provider);
    const result = await ep.fetchEmails(token, maxResults, query, pageToken);
    res.json(result);
  } catch (error: any) {
    console.error('[Email] Fetch error:', error.message);
    res.status(502).json({ error: 'Failed to fetch emails' });
  }
});

// ─── POST /api/gmail/emails/multi ───────────────────────────────────
router.post('/emails/multi', async (req: Request, res: Response) => {
  try {
    const { accounts, maxResults = 20, query = '' } = req.body;
    if (!accounts || !Array.isArray(accounts)) {
      res.status(400).json({ error: 'accounts array is required' });
      return;
    }

    const result = await fetchEmailsMultiAccount(accounts, maxResults, query);
    res.json(result);
  } catch (error: any) {
    console.error('[Email] Multi-account fetch error:', error.message);
    res.status(502).json({ error: 'Failed to fetch emails' });
  }
});

// ─── POST /api/gmail/reply ──────────────────────────────────────────
router.post('/reply', async (req: Request, res: Response) => {
  try {
    const token = (req as any).accessToken;
    const { threadId, to, subject, body, inReplyTo, provider = 'gmail' } = req.body;

    if (!threadId || !to || !subject || !body) {
      res.status(400).json({ error: 'threadId, to, subject, and body are required' });
      return;
    }

    const ep = getEmailProvider(provider);
    const success = await ep.sendReply(token, threadId, to, subject, body, inReplyTo);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(502).json({ error: 'Failed to send reply' });
    }
  } catch (error: any) {
    console.error('[Email] Reply error:', error.message);
    res.status(502).json({ error: 'Failed to send reply' });
  }
});

// ─── POST /api/gmail/modify ────────────────────────────────────────
router.post('/modify', async (req: Request, res: Response) => {
  try {
    const token = (req as any).accessToken;
    const { messageId, addLabels = [], removeLabels = [], provider = 'gmail' } = req.body;

    if (!messageId) {
      res.status(400).json({ error: 'messageId is required' });
      return;
    }

    const ep = getEmailProvider(provider);
    const success = await ep.modifyEmail(token, messageId, addLabels, removeLabels);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(502).json({ error: 'Failed to modify email' });
    }
  } catch (error: any) {
    console.error('[Email] Modify error:', error.message);
    res.status(502).json({ error: 'Failed to modify email' });
  }
});

// ─── GET /api/gmail/providers ────────────────────────────────────────
// List available email providers
router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    providers: ['gmail', 'outlook'],
    note: 'Pass "provider" field in request body to use a specific provider',
  });
});

export default router;
