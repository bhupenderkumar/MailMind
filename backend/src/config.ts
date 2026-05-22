import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export type LLMProvider = 'gemini' | 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  llm: LLMConfig;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function getLLMApiKey(provider: LLMProvider): string {
  switch (provider) {
    case 'gemini':
      return requireEnv('GEMINI_API_KEY');
    case 'openai':
      return requireEnv('OPENAI_API_KEY');
    case 'anthropic':
      return requireEnv('ANTHROPIC_API_KEY');
  }
}

const provider = (process.env.LLM_PROVIDER || 'gemini') as LLMProvider;

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8082').split(',').map(s => s.trim()),
  llm: {
    provider,
    model: process.env.LLM_MODEL || 'gemini-2.5-flash',
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8192', 10),
    apiKey: getLLMApiKey(provider),
  },
};
