import { config, LLMConfig } from '../config';

// ─── Provider Interface ─────────────────────────────────────────────
export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

interface LLMProvider {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  readonly name: string;
  readonly model: string;
}

// ─── Gemini Provider ─────────────────────────────────────────────────
class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(cfg: LLMConfig) {
    this.model = cfg.model;
    this.apiKey = cfg.apiKey;
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const temp = options?.temperature ?? config.llm.temperature;
    const maxTokens = options?.maxTokens ?? config.llm.maxTokens;
    const jsonMode = options?.jsonMode ?? false;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temp,
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }
}

// ─── OpenAI Provider (ready for future) ──────────────────────────────
class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private apiKey: string;

  constructor(cfg: LLMConfig) {
    this.model = cfg.model;
    this.apiKey = cfg.apiKey;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const temp = options?.temperature ?? config.llm.temperature;
    const maxTokens = options?.maxTokens ?? config.llm.maxTokens;
    const jsonMode = options?.jsonMode ?? false;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temp,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty response from OpenAI');
    return text;
  }
}

// ─── Anthropic Provider (ready for future) ───────────────────────────
class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private apiKey: string;

  constructor(cfg: LLMConfig) {
    this.model = cfg.model;
    this.apiKey = cfg.apiKey;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const temp = options?.temperature ?? config.llm.temperature;
    const maxTokens = options?.maxTokens ?? config.llm.maxTokens;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature: temp,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data: any = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Empty response from Anthropic');
    return text;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────
function createProvider(cfg: LLMConfig): LLMProvider {
  switch (cfg.provider) {
    case 'gemini':
      return new GeminiProvider(cfg);
    case 'openai':
      return new OpenAIProvider(cfg);
    case 'anthropic':
      return new AnthropicProvider(cfg);
    default:
      throw new Error(`Unsupported LLM provider: ${cfg.provider}`);
  }
}

// ─── Singleton ───────────────────────────────────────────────────────
let _provider: LLMProvider | null = null;

export function getLLM(): LLMProvider {
  if (!_provider) {
    _provider = createProvider(config.llm);
    console.log(`[LLM] Initialized: ${_provider.name} / ${_provider.model}`);
  }
  return _provider;
}

/** Reset provider (useful if config changes at runtime) */
export function resetLLM(): void {
  _provider = null;
}
