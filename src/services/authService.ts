import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@mailmind_access_token',
  REFRESH_TOKEN: '@mailmind_refresh_token',
  USER_INFO: '@mailmind_user_info',
  TOKEN_EXPIRY: '@mailmind_token_expiry',
};

// Google Cloud Console credentials (project: playschool-372216)
const GOOGLE_CONFIG = {
  expoClientId: '375708216587-48ladj9hbcj9kt3d42punjh7h1ra7qs5.apps.googleusercontent.com',
  androidClientId: '375708216587-48ladj9hbcj9kt3d42punjh7h1ra7qs5.apps.googleusercontent.com',
  webClientId: '375708216587-48ladj9hbcj9kt3d42punjh7h1ra7qs5.apps.googleusercontent.com',
  scopes: [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
};

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  photo?: string;
}

export const useGoogleAuth = () => {
  // On web, use origin+pathname WITH trailing slash (GitHub Pages 301-redirects to add it)
  const redirectUri = Platform.OS === 'web'
    ? (typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname.replace(/\/?$/, '/')}`
        : undefined)
    : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CONFIG.expoClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    scopes: GOOGLE_CONFIG.scopes,
    responseType: 'code',
    usePKCE: true,
    ...(redirectUri ? { redirectUri } : {}),
  });

  return { request, response, promptAsync };
};

export const saveTokens = async (
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  if (expiresIn) {
    const expiry = Date.now() + expiresIn * 1000;
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiry.toString());
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiry = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

  if (token && expiry && Date.now() < parseInt(expiry, 10)) {
    return token;
  }

  // Token expired, try refresh
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (refreshToken) {
    return await refreshAccessToken(refreshToken);
  }

  return null;
};

const refreshAccessToken = async (
  refreshToken: string
): Promise<string | null> => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CONFIG.webClientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json();
    if (data.access_token) {
      await saveTokens(data.access_token, undefined, data.expires_in);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
};

export const fetchUserInfo = async (
  accessToken: string
): Promise<UserInfo | null> => {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();
    const userInfo: UserInfo = {
      id: data.id,
      email: data.email,
      name: data.name,
      photo: data.picture,
    };
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_INFO,
      JSON.stringify(userInfo)
    );
    return userInfo;
  } catch {
    return null;
  }
};

export const getSavedUserInfo = async (): Promise<UserInfo | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const logout = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER_INFO,
    STORAGE_KEYS.TOKEN_EXPIRY,
  ]);
};
