import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { LoginScreen } from './src/screens/LoginScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { EmailDetailScreen } from './src/screens/EmailDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DigestScreen } from './src/screens/DigestScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import {
  saveTokens,
  fetchUserInfo,
  getSavedUserInfo,
  getAccessToken,
  UserInfo,
} from './src/services/authService';
import {
  addLinkedAccount,
  getLinkedAccounts,
  clearAllAccounts,
} from './src/services/accountService';
import { EmailWithSummary } from './src/types';
import { COLORS } from './src/constants/theme';

WebBrowser.maybeCompleteAuthSession();

type Screen = 'login' | 'inbox' | 'detail' | 'settings' | 'digest' | 'dashboard' | 'chat';

// Google Cloud Console credentials (project: playschool-372216)
const GOOGLE_WEB_CLIENT_ID = '375708216587-48ladj9hbcj9kt3d42punjh7h1ra7qs5.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '375708216587-48ladj9hbcj9kt3d42punjh7h1ra7qs5.apps.googleusercontent.com';
const GOOGLE_EXPO_CLIENT_ID = '375708216587-48ladj9hbcj9kt3d42punjh7h1ra7qs5.apps.googleusercontent.com';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const isAddingAccount = useRef(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_EXPO_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    extraParams: { prompt: 'select_account' },
  });

  // Check for existing session on launch
  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = await getSavedUserInfo();
      const token = await getAccessToken();
      if (savedUser && token) {
        setUser(savedUser);
        setScreen('dashboard');
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Handle Google Auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleAuthSuccess(authentication.accessToken);
      }
    }
  }, [response]);

  const handleAuthSuccess = async (accessToken: string) => {
    await saveTokens(accessToken, undefined, 3600);
    const userInfo = await fetchUserInfo(accessToken);
    if (userInfo) {
      // Always save as a linked account
      await addLinkedAccount(userInfo, accessToken, undefined, 3600);

      if (isAddingAccount.current) {
        // Adding additional account — stay on settings
        isAddingAccount.current = false;
        setScreen('inbox');
      } else {
        setUser(userInfo);
        setScreen('dashboard');
      }
    }
  };

  const handleLogin = () => {
    isAddingAccount.current = false;
    promptAsync();
  };

  const handleAddAccount = () => {
    isAddingAccount.current = true;
    promptAsync();
  };

  const handleLogout = async () => {
    await clearAllAccounts();
    setUser(null);
    setScreen('login');
  };

  const handleEmailPress = (email: EmailWithSummary) => {
    setSelectedEmail(email);
    setScreen('detail');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  switch (screen) {
    case 'login':
      return <LoginScreen onLogin={handleLogin} />;

    case 'inbox':
      return (
        <InboxScreen
          user={user!}
          onEmailPress={handleEmailPress}
          onSettingsPress={() => setScreen('settings')}
          onDigestPress={() => setScreen('digest')}
          onDashboardPress={() => setScreen('dashboard')}
          onChatPress={() => setScreen('chat')}
        />
      );

    case 'detail':
      return (
        <EmailDetailScreen
          email={selectedEmail!}
          onBack={() => setScreen('inbox')}
        />
      );

    case 'settings':
      return (
        <SettingsScreen
          user={user!}
          onBack={() => setScreen('inbox')}
          onLogout={handleLogout}
          onAddAccount={handleAddAccount}
        />
      );

    case 'digest':
      return <DigestScreen onBack={() => setScreen('inbox')} />;

    case 'dashboard':
      return (
        <DashboardScreen
          onBack={() => setScreen('inbox')}
          onOpenChat={() => setScreen('chat')}
          onOpenInbox={() => setScreen('inbox')}
          onOpenSettings={() => setScreen('settings')}
        />
      );

    case 'chat':
      return <ChatScreen onBack={() => setScreen('inbox')} />;

    default:
      return <LoginScreen onLogin={handleLogin} />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
