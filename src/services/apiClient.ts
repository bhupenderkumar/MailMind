import { Platform } from 'react-native';

// Backend URL — use localhost for dev, replace with production URL for release
const DEV_BACKEND = Platform.OS === 'web' ? 'http://localhost:3001' : 'http://10.0.2.2:3001'; // Android emulator uses 10.0.2.2
const PROD_BACKEND = 'https://mailmind-api.your-domain.com'; // TODO: update for production

export const BACKEND_URL = __DEV__ ? DEV_BACKEND : PROD_BACKEND;

export async function apiCall<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    token?: string;
  } = {}
): Promise<T> {
  const { method = 'POST', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error ${response.status}`);
  }

  return response.json();
}
