import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserInfo } from './authService';

const ACCOUNTS_KEY = '@mailmind_accounts';
const ACTIVE_ACCOUNT_KEY = '@mailmind_active_account';

export interface LinkedAccount {
  id: string;
  email: string;
  name: string;
  photo?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry: number;
  addedAt: string;
}

export const getLinkedAccounts = async (): Promise<LinkedAccount[]> => {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addLinkedAccount = async (
  userInfo: UserInfo,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<LinkedAccount> => {
  const accounts = await getLinkedAccounts();

  const existing = accounts.findIndex((a) => a.email === userInfo.email);
  const account: LinkedAccount = {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    photo: userInfo.photo,
    accessToken,
    refreshToken: refreshToken || undefined,
    tokenExpiry: expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 3600000,
    addedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.push(account);
  }

  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return account;
};

export const removeLinkedAccount = async (email: string): Promise<void> => {
  const accounts = await getLinkedAccounts();
  const filtered = accounts.filter((a) => a.email !== email);
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
};

export const updateAccountToken = async (
  email: string,
  accessToken: string,
  expiresIn?: number
): Promise<void> => {
  const accounts = await getLinkedAccounts();
  const idx = accounts.findIndex((a) => a.email === email);
  if (idx >= 0) {
    accounts[idx].accessToken = accessToken;
    accounts[idx].tokenExpiry = expiresIn
      ? Date.now() + expiresIn * 1000
      : Date.now() + 3600000;
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
};

export const getAccountToken = async (email: string): Promise<string | null> => {
  const accounts = await getLinkedAccounts();
  const account = accounts.find((a) => a.email === email);
  if (!account) return null;

  if (Date.now() < account.tokenExpiry) {
    return account.accessToken;
  }

  // Token expired - would need re-auth
  return null;
};

export const getActiveAccountId = async (): Promise<string | null> => {
  return AsyncStorage.getItem(ACTIVE_ACCOUNT_KEY);
};

export const setActiveAccountId = async (id: string): Promise<void> => {
  await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
};

export const clearAllAccounts = async (): Promise<void> => {
  await AsyncStorage.multiRemove([ACCOUNTS_KEY, ACTIVE_ACCOUNT_KEY]);
};
