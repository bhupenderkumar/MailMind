import { AIResponse, Email, EmailAction } from '../types';
import { apiCall } from './apiClient';
import { getAccessToken } from './authService';

async function getToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export const summarizeEmail = async (email: Email): Promise<AIResponse> => {
  try {
    const token = await getToken();
    return await apiCall<AIResponse>('/api/ai/summarize', {
      body: { email },
      token,
    });
  } catch {
    return {
      summary: email.bodyPreview || 'Unable to summarize this email.',
      priority: 'normal',
      sentiment: 'neutral',
      category: 'personal',
      actionItems: [],
      needsReply: false,
    };
  }
};

export const generateDailyDigest = async (
  summaries: AIResponse[],
  emailCount: number
): Promise<string> => {
  try {
    const token = await getToken();
    const result = await apiCall<{ digest: string }>('/api/ai/digest', {
      body: { summaries, emailCount },
      token,
    });
    return result.digest;
  } catch {
    return `Today you received ${emailCount} emails. ${summaries.filter((s) => s.priority === 'urgent').length} need urgent attention.`;
  }
};

export const generateSmartReply = async (
  email: Email,
  tone: 'professional' | 'casual' | 'friendly' | 'formal' = 'professional'
): Promise<string> => {
  try {
    const token = await getToken();
    const result = await apiCall<{ reply: string }>('/api/ai/smart-reply', {
      body: { email, tone },
      token,
    });
    return result.reply;
  } catch {
    return 'Thank you for your email. I will review and get back to you shortly.';
  }
};

export const chatWithEmails = async (
  userMessage: string,
  emails: Email[],
  conversationHistory: { role: string; content: string }[] = []
): Promise<string> => {
  try {
    const token = await getToken();
    const result = await apiCall<{ response: string }>('/api/ai/chat', {
      body: { message: userMessage, emails, conversationHistory },
      token,
    });
    return result.response;
  } catch {
    return "I'm sorry, I couldn't process that request. Please try again.";
  }
};

export const getEmailActions = async (email: Email): Promise<EmailAction[]> => {
  try {
    const token = await getToken();
    const result = await apiCall<{ actions: EmailAction[] }>('/api/ai/actions', {
      body: { email },
      token,
    });
    return result.actions;
  } catch {
    return [];
  }
};
