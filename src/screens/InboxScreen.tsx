import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, APP_CONFIG } from '../constants/theme';
import { EmailCard } from '../components/EmailCard';
import { fetchEmails, fetchEmailsMultiAccount } from '../services/gmailService';
import { summarizeEmail } from '../services/aiService';
import { saveSummary, getSummaries, getDailyUsageCount, incrementDailyUsage } from '../services/storageService';
import { EmailWithSummary, EmailSummary, EmailPriority } from '../types';
import { UserInfo } from '../services/authService';
import { LinkedAccount, getLinkedAccounts } from '../services/accountService';

type FilterType = 'all' | 'urgent' | 'action' | 'newsletter';
type AccountFilter = 'unified' | string; // 'unified' or account email

interface InboxScreenProps {
  user: UserInfo;
  onEmailPress: (email: EmailWithSummary) => void;
  onSettingsPress: () => void;
  onDigestPress: () => void;
  onDashboardPress: () => void;
  onChatPress: () => void;
}

export const InboxScreen: React.FC<InboxScreenProps> = ({
  user,
  onEmailPress,
  onSettingsPress,
  onDigestPress,
  onDashboardPress,
  onChatPress,
}) => {
  const [emails, setEmails] = useState<EmailWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [dailyUsage, setDailyUsage] = useState(0);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('unified');
  const [accountEmailCounts, setAccountEmailCounts] = useState<Record<string, number>>({});

  const loadEmails = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const accounts = await getLinkedAccounts();
      setLinkedAccounts(accounts);

      let fetched: import('../types').Email[] = [];

      if (accounts.length > 1) {
        // Multi-account: fetch from all accounts
        const validAccounts = accounts
          .filter((a) => a.accessToken && Date.now() < a.tokenExpiry)
          .map((a) => ({ email: a.email, token: a.accessToken }));

        if (validAccounts.length > 0) {
          const { emails: multiEmails, accountEmails } = await fetchEmailsMultiAccount(
            validAccounts,
            20
          );
          fetched = multiEmails;
          setAccountEmailCounts(accountEmails);
        }
      } else {
        // Single account: use original flow
        const { emails: singleEmails } = await fetchEmails(30);
        fetched = singleEmails;
      }

      const savedSummaries = await getSummaries();
      const usage = await getDailyUsageCount();
      setDailyUsage(usage);

      const withSummaries: EmailWithSummary[] = fetched.map((email) => ({
        ...email,
        summary: savedSummaries[email.id]
          ? {
              id: email.id,
              emailId: email.id,
              ...savedSummaries[email.id],
              createdAt: savedSummaries[email.id].createdAt || new Date().toISOString(),
            } as EmailSummary
          : undefined,
      }));

      setEmails(withSummaries);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmails(false);
    setRefreshing(false);
  }, [loadEmails]);

  const summarizeAll = async () => {
    setSummarizing(true);
    const unsummarized = emails.filter((e) => !e.summary);
    let usage = dailyUsage;

    for (const email of unsummarized) {
      if (usage >= APP_CONFIG.freeTierLimit) break;

      try {
        const aiResult = await summarizeEmail(email);
        const summary: EmailSummary = {
          id: email.id,
          emailId: email.id,
          summary: aiResult.summary,
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          category: aiResult.category,
          actionItems: aiResult.actionItems,
          needsReply: aiResult.needsReply,
          suggestedReply: aiResult.suggestedReply,
          languageDetected: 'en',
          createdAt: new Date().toISOString(),
        };

        await saveSummary(summary);
        usage = await incrementDailyUsage();

        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, summary } : e))
        );
      } catch (error) {
        console.error('Failed to summarize:', error);
      }
    }

    setDailyUsage(usage);
    setSummarizing(false);
  };

  const filteredEmails = emails.filter((email) => {
    // Account filter
    if (accountFilter !== 'unified' && email.accountId !== accountFilter) {
      return false;
    }
    // Category filter
    switch (activeFilter) {
      case 'urgent':
        return email.summary?.priority === 'urgent';
      case 'action':
        return email.summary?.needsReply || (email.summary?.actionItems?.length ?? 0) > 0;
      case 'newsletter':
        return email.summary?.category === 'newsletter' || email.summary?.category === 'spam';
      default:
        return true;
    }
  });

  const urgentCount = emails.filter((e) => e.summary?.priority === 'urgent').length;
  const actionCount = emails.filter(
    (e) => e.summary?.needsReply || (e.summary?.actionItems?.length ?? 0) > 0
  ).length;
  const unsummarizedCount = emails.filter((e) => !e.summary).length;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: emails.length },
    { key: 'urgent', label: '🔴 Urgent', count: urgentCount },
    { key: 'action', label: '✅ Action', count: actionCount },
    { key: 'newsletter', label: '📰 Skip', count: undefined },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your emails...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {user.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.subGreeting}>
              {emails.length} emails • {urgentCount} urgent
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onChatPress} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDashboardPress} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSettingsPress} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Usage bar */}
        <View style={styles.usageBar}>
          <Text style={styles.usageText}>
            {dailyUsage}/{APP_CONFIG.freeTierLimit} summaries used today
          </Text>
          <View style={styles.usageTrack}>
            <View
              style={[
                styles.usageFill,
                {
                  width: `${Math.min((dailyUsage / APP_CONFIG.freeTierLimit) * 100, 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Account Tabs (shown when multiple accounts linked) */}
      {linkedAccounts.length > 1 && (
        <View style={styles.accountTabsRow}>
          <TouchableOpacity
            style={[
              styles.accountTab,
              accountFilter === 'unified' && styles.accountTabActive,
            ]}
            onPress={() => setAccountFilter('unified')}
          >
            <Text style={[
              styles.accountTabText,
              accountFilter === 'unified' && styles.accountTabTextActive,
            ]}>
              📬 All ({emails.length})
            </Text>
          </TouchableOpacity>
          {linkedAccounts.map((account) => (
            <TouchableOpacity
              key={account.email}
              style={[
                styles.accountTab,
                accountFilter === account.email && styles.accountTabActive,
              ]}
              onPress={() => setAccountFilter(account.email)}
            >
              <Text style={[
                styles.accountTabText,
                accountFilter === account.email && styles.accountTabTextActive,
              ]}>
                {account.email.split('@')[0]} ({accountEmailCounts[account.email] || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Summarize button */}
      {unsummarizedCount > 0 && dailyUsage < APP_CONFIG.freeTierLimit && (
        <TouchableOpacity
          style={styles.summarizeButton}
          onPress={summarizeAll}
          disabled={summarizing}
          activeOpacity={0.8}
        >
          {summarizing ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.summarizeText}> Summarizing...</Text>
            </>
          ) : (
            <Text style={styles.summarizeText}>
              ✨ Summarize {Math.min(unsummarizedCount, APP_CONFIG.freeTierLimit - dailyUsage)} emails with AI
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.filterTextActive,
              ]}
            >
              {filter.label}
              {filter.count !== undefined ? ` (${filter.count})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Email list */}
      <FlatList
        data={filteredEmails}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EmailCard email={item} onPress={() => onEmailPress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No emails match this filter</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
  },
  usageBar: {
    marginTop: SPACING.lg,
  },
  usageText: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.xs,
  },
  usageTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  usageFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  summarizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  summarizeText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  accountTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accountTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  accountTabActive: {
    backgroundColor: COLORS.primary,
  },
  accountTabText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  accountTabTextActive: {
    color: '#FFFFFF',
  },
});
