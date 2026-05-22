import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import aiRoutes from './routes/ai';
import gmailRoutes from './routes/gmail';
import { getLLM } from './services/llmService';

const app = express();

// ─── Security ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// ─── Rate Limiting ───────────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max: 30,                // 30 AI requests per minute
  message: { error: 'Too many AI requests, please slow down' },
});

const gmailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,                // 60 Gmail proxy requests per minute
  message: { error: 'Too many requests, please slow down' },
});

// ─── Body Parser ─────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/gmail', gmailLimiter, gmailRoutes);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const llm = getLLM();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    llm: { provider: llm.name, model: llm.model },
  });
});

// ─── Start ───────────────────────────────────────────────────────────
app.listen(config.port, () => {
  const llm = getLLM();
  console.log(`\n🚀 MailMind Backend running on http://localhost:${config.port}`);
  console.log(`📡 LLM: ${llm.name} / ${llm.model}`);
  console.log(`🔒 CORS: ${config.corsOrigins.join(', ')}`);
  console.log(`⚡ Environment: ${config.nodeEnv}\n`);
});
