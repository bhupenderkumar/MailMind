import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailSummary, EmailWithSummary, UserSettings, DailyDigest } from '../types';

const KEYS = {
  SUMMARIES: '@mailmind_summaries',
  SETTINGS: '@mailmind_settings',
  DIGEST: '@mailmind_digest_',
  DAILY_COUNT: '@mailmind_daily_count_',
};

const DEFAULT_SETTINGS: UserSettings = {
  summaryLength: 'medium',
  language: 'english',
  autoSummarize: true,
  digestTime: '20:00',
  notifyUrgentOnly: true,
};

// --- Summaries ---
export const saveSummary = async (summary: EmailSummary): Promise<void> => {
  const existing = await getSummaries();
  existing[summary.emailId] = summary;
  await AsyncStorage.setItem(KEYS.SUMMARIES, JSON.stringify(existing));
};

export const getSummaries = async (): Promise<Record<string, EmailSummary>> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SUMMARIES);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const getSummaryForEmail = async (emailId: string): Promise<EmailSummary | null> => {
  const summaries = await getSummaries();
  return summaries[emailId] || null;
};

// --- Settings ---
export const getSettings = async (): Promise<UserSettings> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<UserSettings>): Promise<void> => {
  const current = await getSettings();
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
};

// --- Daily Usage Tracking (for free tier limit) ---
export const getDailyUsageCount = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const data = await AsyncStorage.getItem(KEYS.DAILY_COUNT + today);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
};

export const incrementDailyUsage = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const count = await getDailyUsageCount();
  const newCount = count + 1;
  await AsyncStorage.setItem(KEYS.DAILY_COUNT + today, newCount.toString());
  return newCount;
};

// --- Daily Digest ---
export const saveDailyDigest = async (digest: DailyDigest): Promise<void> => {
  await AsyncStorage.setItem(KEYS.DIGEST + digest.date, JSON.stringify(digest));
};

export const getDailyDigest = async (date: string): Promise<DailyDigest | null> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.DIGEST + date);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};
