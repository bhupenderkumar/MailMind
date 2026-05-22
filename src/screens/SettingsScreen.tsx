import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { UserInfo, logout } from '../services/authService';
import { getSettings, saveSettings } from '../services/storageService';
import { UserSettings } from '../types';
import { LinkedAccount, getLinkedAccounts, removeLinkedAccount } from '../services/accountService';

interface SettingsScreenProps {
  user: UserInfo;
  onBack: () => void;
  onLogout: () => void;
  onAddAccount?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onLogout,
  onAddAccount,
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    summaryLength: 'medium',
    language: 'english',
    autoSummarize: true,
    digestTime: '20:00',
    notifyUrgentOnly: true,
  });
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  useEffect(() => {
    loadSettings();
    loadAccounts();
  }, []);

  const loadSettings = async () => {
    const saved = await getSettings();
    setSettings(saved);
  };

  const loadAccounts = async () => {
    const accounts = await getLinkedAccounts();
    setLinkedAccounts(accounts);
  };

  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings({ [key]: value });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>Free</Text>
            </View>
          </View>
        </View>

        {/* Upgrade Card */}
        <TouchableOpacity style={styles.upgradeCard} activeOpacity={0.8}>
          <Text style={styles.upgradeEmoji}>⭐</Text>
          <View style={styles.upgradeInfo}>
            <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
            <Text style={styles.upgradeDesc}>
              Unlimited summaries, smart replies, multi-account
            </Text>
          </View>
          <Text style={styles.upgradePrice}>₹249/mo</Text>
        </TouchableOpacity>

        {/* AI Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Settings</Text>

          {/* Summary Length */}
          <Text style={styles.settingLabel}>Summary Length</Text>
          <View style={styles.segmentedControl}>
            {(['short', 'medium', 'detailed'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.segment,
                  settings.summaryLength === option && styles.segmentActive,
                ]}
                onPress={() => updateSetting('summaryLength', option)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.summaryLength === option && styles.segmentTextActive,
                  ]}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Language */}
          <Text style={styles.settingLabel}>Summary Language</Text>
          <View style={styles.segmentedControl}>
            {(['english', 'hindi', 'both'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.segment,
                  settings.language === option && styles.segmentActive,
                ]}
                onPress={() => updateSetting('language', option)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.language === option && styles.segmentTextActive,
                  ]}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Auto Summarize */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Auto-Summarize</Text>
              <Text style={styles.toggleDesc}>
                Automatically summarize new emails
              </Text>
            </View>
            <Switch
              value={settings.autoSummarize}
              onValueChange={(v) => updateSetting('autoSummarize', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={settings.autoSummarize ? COLORS.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Urgent Emails Only</Text>
              <Text style={styles.toggleDesc}>
                Only notify for urgent priority emails
              </Text>
            </View>
            <Switch
              value={settings.notifyUrgentOnly}
              onValueChange={(v) => updateSetting('notifyUrgentOnly', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={settings.notifyUrgentOnly ? COLORS.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Daily Digest</Text>
              <Text style={styles.toggleDesc}>
                Receive daily summary at {settings.digestTime}
              </Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={COLORS.primary}
            />
          </View>
        </View>

        {/* Email Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Accounts</Text>

          {linkedAccounts.map((account) => (
            <View key={account.email} style={styles.accountCard}>
              <Text style={styles.accountIcon}>📧</Text>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountEmail}>{account.email}</Text>
              </View>
              <View style={[styles.statusDot, {
                backgroundColor: Date.now() < account.tokenExpiry ? COLORS.success : '#FF6B6B',
              }]} />
              {linkedAccounts.length > 1 && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Remove Account', `Remove ${account.email}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          await removeLinkedAccount(account.email);
                          loadAccounts();
                        },
                      },
                    ]);
                  }}
                  style={{ paddingLeft: SPACING.sm }}
                >
                  <Text style={{ color: '#FF6B6B', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {linkedAccounts.length === 0 && (
            <View style={styles.accountCard}>
              <Text style={styles.accountIcon}>📧</Text>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>Gmail</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
            </View>
          )}

          <TouchableOpacity
            style={styles.addAccountButton}
            onPress={onAddAccount}
          >
            <Text style={styles.addAccountIcon}>+</Text>
            <Text style={styles.addAccountText}>
              Add Another Gmail Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* About & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Terms of Service</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Rate on Play Store</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Version</Text>
            <Text style={styles.versionText}>1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    width: 60,
  },
  backText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  profileAvatarText: {
    color: '#FFF',
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  planBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  planText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  upgradeEmoji: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  upgradeDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  upgradePrice: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.warning,
  },
  settingLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  toggleLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  accountIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  accountEmail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
  },
  addAccountIcon: {
    fontSize: 20,
    color: COLORS.textLight,
    marginRight: SPACING.md,
    fontWeight: '700',
  },
  addAccountText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textLight,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  menuItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  menuArrow: {
    fontSize: FONTS.sizes.xl,
    color: COLORS.textLight,
  },
  versionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textLight,
  },
  logoutButton: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.error,
  },
});
