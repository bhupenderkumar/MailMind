import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { fetchEmails, fetchEmailsMultiAccount } from '../services/gmailService';
import { getLinkedAccounts, LinkedAccount } from '../services/accountService';
import { Email, EmailCategory } from '../types';

type DateRange = '1d' | '3d' | '7d' | '30d';

interface DashboardScreenProps {
  onBack: () => void;
  onOpenChat: () => void;
  onOpenInbox?: () => void;
  onOpenSettings?: () => void;
}

const DATE_RANGES: { key: DateRange; label: string; days: number }[] = [
  { key: '1d', label: 'Today', days: 1 },
  { key: '3d', label: '3 Days', days: 3 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
];

const CATEGORY_EMOJI: Record<string, string> = {
  work: '💼',
  personal: '👤',
  finance: '💰',
  shopping: '🛒',
  newsletter: '📰',
  social: '💬',
  spam: '🚫',
  promotions: '🏷️',
  updates: '🔔',
};

const CHART_COLORS = ['#4A90D9', '#FF6B6B', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onBack, onOpenChat, onOpenInbox, onOpenSettings }) => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    starred: 0,
    withAttachments: 0,
    avgPerDay: 0,
    topSenders: [] as { name: string; email: string; count: number }[],
    dailyVolume: [] as { date: string; count: number; label: string }[],
    categoryBreakdown: {} as Record<string, number>,
    accountBreakdown: {} as Record<string, number>,
    hourlyDistribution: [] as { hour: number; count: number }[],
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const linkedAccounts = await getLinkedAccounts();
      setAccounts(linkedAccounts);

      const rangeConfig = DATE_RANGES.find((r) => r.key === dateRange)!;
      const query = `newer_than:${rangeConfig.days}d`;
      let allEmails: Email[] = [];

      if (linkedAccounts.length > 1) {
        const validAccounts = linkedAccounts
          .filter((a) => a.accessToken && Date.now() < a.tokenExpiry)
          .map((a) => ({ email: a.email, token: a.accessToken }));

        if (validAccounts.length > 0) {
          const results = await Promise.allSettled(
            validAccounts.map(async (account) => {
              const { emails: fetched } = await fetchEmails(100, query, undefined, account.token);
              return fetched.map((e) => ({ ...e, accountId: account.email }));
            })
          );
          for (const r of results) {
            if (r.status === 'fulfilled') allEmails.push(...r.value);
          }
        }
      } else {
        const { emails: fetched } = await fetchEmails(100, query);
        allEmails = fetched;
      }

      setEmails(allEmails);
      computeStats(allEmails, rangeConfig.days);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const computeStats = (emailList: Email[], days: number) => {
    // Basic counts
    const unread = emailList.filter((e) => !e.isRead).length;
    const starred = emailList.filter((e) => e.isStarred).length;
    const withAttachments = emailList.filter((e) => e.hasAttachments).length;

    // Top senders
    const senderMap: Record<string, { name: string; email: string; count: number }> = {};
    emailList.forEach((e) => {
      const key = e.from.email;
      if (!senderMap[key]) {
        senderMap[key] = { name: e.from.name, email: e.from.email, count: 0 };
      }
      senderMap[key].count++;
    });
    const topSenders = Object.values(senderMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Daily volume
    const dayMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }
    emailList.forEach((e) => {
      const key = new Date(e.receivedAt).toISOString().split('T')[0];
      if (dayMap[key] !== undefined) dayMap[key]++;
    });
    const dailyVolume = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const d = new Date(date);
        return {
          date,
          count,
          label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        };
      });

    // Category breakdown (from labels)
    const categoryBreakdown: Record<string, number> = {};
    emailList.forEach((e) => {
      const labels = e.labels || [];
      let cat = 'other';
      if (labels.includes('CATEGORY_PROMOTIONS')) cat = 'promotions';
      else if (labels.includes('CATEGORY_SOCIAL')) cat = 'social';
      else if (labels.includes('CATEGORY_UPDATES')) cat = 'updates';
      else if (labels.includes('CATEGORY_FORUMS')) cat = 'forums';
      else if (labels.includes('CATEGORY_PERSONAL')) cat = 'personal';
      else if (labels.includes('IMPORTANT')) cat = 'important';
      else cat = 'primary';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Account breakdown
    const accountBreakdown: Record<string, number> = {};
    emailList.forEach((e) => {
      const acct = e.accountId || 'primary';
      accountBreakdown[acct] = (accountBreakdown[acct] || 0) + 1;
    });

    // Hourly distribution
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    emailList.forEach((e) => {
      const hour = new Date(e.receivedAt).getHours();
      hourMap[hour]++;
    });
    const hourlyDistribution = Object.entries(hourMap).map(([h, count]) => ({
      hour: parseInt(h),
      count,
    }));

    setStats({
      total: emailList.length,
      unread,
      starred,
      withAttachments,
      avgPerDay: days > 0 ? Math.round((emailList.length / days) * 10) / 10 : 0,
      topSenders,
      dailyVolume,
      categoryBreakdown,
      accountBreakdown,
      hourlyDistribution,
    });
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const maxDailyVolume = Math.max(...stats.dailyVolume.map((d) => d.count), 1);
  const maxHourlyVolume = Math.max(...stats.hourlyDistribution.map((h) => h.count), 1);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Building your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Inbox</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 MailMind</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onOpenChat} style={styles.chatButton}>
            <Text style={styles.chatButtonText}>💬</Text>
          </TouchableOpacity>
          {onOpenSettings && (
            <TouchableOpacity onPress={onOpenSettings} style={styles.chatButton}>
              <Text style={styles.chatButtonText}>⚙️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Range Filter */}
      <View style={styles.dateFilterRow}>
        {DATE_RANGES.map((range) => (
          <TouchableOpacity
            key={range.key}
            style={[styles.dateChip, dateRange === range.key && styles.dateChipActive]}
            onPress={() => setDateRange(range.key)}
          >
            <Text style={[styles.dateChipText, dateRange === range.key && styles.dateChipTextActive]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Overview Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.statEmoji}>📧</Text>
            <Text style={[styles.statNumber, { color: COLORS.info }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Emails</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.statEmoji}>📬</Text>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>{stats.unread}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.starred}</Text>
            <Text style={styles.statLabel}>Starred</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FCE7F3' }]}>
            <Text style={styles.statEmoji}>📎</Text>
            <Text style={[styles.statNumber, { color: '#EC4899' }]}>{stats.withAttachments}</Text>
            <Text style={styles.statLabel}>Attachments</Text>
          </View>
        </View>

        {/* Avg per day */}
        <View style={styles.avgCard}>
          <Text style={styles.avgLabel}>📈 Average</Text>
          <Text style={styles.avgValue}>{stats.avgPerDay} emails/day</Text>
        </View>

        {/* Account Breakdown (multi-account) */}
        {accounts.length > 1 && Object.keys(stats.accountBreakdown).length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📬 Account Breakdown</Text>
            {Object.entries(stats.accountBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([acct, count], i) => (
                <View key={acct} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {acct.split('@')[0]}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(count / stats.total) * 100}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Daily Email Volume Chart */}
        {stats.dailyVolume.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Daily Email Volume</Text>
            <View style={styles.chartContainer}>
              {stats.dailyVolume.map((day, i) => (
                <View key={day.date} style={styles.chartBarWrapper}>
                  <Text style={styles.chartBarValue}>{day.count}</Text>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max((day.count / maxDailyVolume) * 120, 4),
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      },
                    ]}
                  />
                  <Text style={styles.chartBarLabel} numberOfLines={1}>
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category Breakdown */}
        {Object.keys(stats.categoryBreakdown).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏷️ Categories</Text>
            {Object.entries(stats.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count], i) => (
                <View key={cat} style={styles.barRow}>
                  <Text style={styles.barLabel}>
                    {CATEGORY_EMOJI[cat] || '📁'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(count / stats.total) * 100}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Top Senders */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Top Senders</Text>
          {stats.topSenders.map((sender, i) => (
            <View key={sender.email} style={styles.senderRow}>
              <View style={[styles.senderAvatar, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]}>
                <Text style={styles.senderAvatarText}>
                  {sender.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.senderInfo}>
                <Text style={styles.senderName} numberOfLines={1}>{sender.name}</Text>
                <Text style={styles.senderEmail} numberOfLines={1}>{sender.email}</Text>
              </View>
              <View style={styles.senderCountBadge}>
                <Text style={styles.senderCount}>{sender.count}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Hourly Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🕐 Peak Hours</Text>
          <Text style={styles.cardSubtitle}>When you receive the most emails</Text>
          <View style={styles.hourlyChart}>
            {stats.hourlyDistribution
              .filter((_, i) => i % 2 === 0) // Show every 2 hours
              .map((h) => (
                <View key={h.hour} style={styles.hourlyBarWrapper}>
                  <View
                    style={[
                      styles.hourlyBar,
                      {
                        height: Math.max((h.count / maxHourlyVolume) * 60, 2),
                        backgroundColor: h.count > maxHourlyVolume * 0.7 ? COLORS.urgent : COLORS.primary,
                      },
                    ]}
                  />
                  <Text style={styles.hourlyLabel}>
                    {h.hour.toString().padStart(2, '0')}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          {onOpenInbox && (
            <TouchableOpacity style={styles.quickAction} onPress={onOpenInbox}>
              <Text style={styles.quickActionEmoji}>📬</Text>
              <Text style={styles.quickActionLabel}>Inbox</Text>
              <Text style={styles.quickActionCount}>{stats.unread} unread</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.quickAction} onPress={onOpenChat}>
            <Text style={styles.quickActionEmoji}>💬</Text>
            <Text style={styles.quickActionLabel}>AI Chat</Text>
            <Text style={styles.quickActionCount}>Ask anything</Text>
          </TouchableOpacity>
          {onOpenInbox && (
            <TouchableOpacity style={[styles.quickAction, stats.starred > 0 && styles.quickActionUrgent]} onPress={() => { onOpenInbox(); }}>
              <Text style={styles.quickActionEmoji}>⭐</Text>
              <Text style={styles.quickActionLabel}>Starred</Text>
              <Text style={styles.quickActionCount}>{stats.starred} emails</Text>
            </TouchableOpacity>
          )}
          {onOpenSettings && (
            <TouchableOpacity style={styles.quickAction} onPress={onOpenSettings}>
              <Text style={styles.quickActionEmoji}>⚙️</Text>
              <Text style={styles.quickActionLabel}>Settings</Text>
              <Text style={styles.quickActionCount}>Accounts</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chat CTA */}
        <TouchableOpacity style={styles.chatCTA} onPress={onOpenChat}>
          <Text style={styles.chatCTAEmoji}>💬</Text>
          <View style={styles.chatCTAContent}>
            <Text style={styles.chatCTATitle}>Ask AI about your emails</Text>
            <Text style={styles.chatCTASubtitle}>
              "What are my urgent emails?" • "Summarize this week"
            </Text>
          </View>
          <Text style={styles.chatCTAArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: SPACING.lg, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  backButton: { padding: SPACING.sm, width: 60 },
  backText: { fontSize: FONTS.sizes.lg, color: '#FFFFFF', fontWeight: '600' },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: '#FFFFFF' },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: { fontSize: 20 },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dateFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  dateChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateChipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  dateChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, paddingHorizontal: SPACING.lg },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  statCard: {
    width: '47%',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statEmoji: { fontSize: 24, marginBottom: SPACING.xs },
  statNumber: { fontSize: FONTS.sizes.xxxl, fontWeight: '800' },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },
  avgCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  avgLabel: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600' },
  avgValue: { fontSize: FONTS.sizes.lg, color: COLORS.primary, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    ...SHADOWS.md,
  },
  cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  cardSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: -SPACING.md, marginBottom: SPACING.lg },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  barLabel: { width: 100, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 5,
    marginHorizontal: SPACING.md,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: 5 },
  barCount: { width: 30, fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    paddingTop: SPACING.md,
  },
  chartBarWrapper: { alignItems: 'center', flex: 1 },
  chartBar: { width: 20, borderRadius: 4, marginBottom: SPACING.xs },
  chartBarValue: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  chartBarLabel: { fontSize: 8, color: COLORS.textLight, marginTop: 2 },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  senderAvatarText: { color: '#FFF', fontSize: FONTS.sizes.md, fontWeight: '700' },
  senderInfo: { flex: 1 },
  senderName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  senderEmail: { fontSize: FONTS.sizes.xs, color: COLORS.textLight },
  senderCountBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  senderCount: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  hourlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 90,
  },
  hourlyBarWrapper: { alignItems: 'center', flex: 1 },
  hourlyBar: { width: 14, borderRadius: 3, marginBottom: 4 },
  hourlyLabel: { fontSize: 8, color: COLORS.textLight },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  quickAction: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickActionUrgent: {
    borderColor: COLORS.urgent,
    backgroundColor: '#FEF2F2',
  },
  quickActionEmoji: { fontSize: 28, marginBottom: SPACING.sm },
  quickActionLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  quickActionCount: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  chatCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    ...SHADOWS.lg,
  },
  chatCTAEmoji: { fontSize: 32, marginRight: SPACING.md },
  chatCTAContent: { flex: 1 },
  chatCTATitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#FFFFFF' },
  chatCTASubtitle: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  chatCTAArrow: { fontSize: 24, color: '#FFFFFF', fontWeight: '700' },
});
