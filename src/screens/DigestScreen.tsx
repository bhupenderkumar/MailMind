import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { fetchEmails } from '../services/gmailService';
import { summarizeEmail, generateDailyDigest } from '../services/aiService';
import { getSummaries } from '../services/storageService';
import { AIResponse } from '../types';

interface DigestScreenProps {
  onBack: () => void;
}

export const DigestScreen: React.FC<DigestScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [digestText, setDigestText] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    needsReply: 0,
    actionItems: 0,
    categories: {} as Record<string, number>,
  });

  useEffect(() => {
    loadDigest();
  }, []);

  const loadDigest = async () => {
    setLoading(true);
    try {
      const { emails } = await fetchEmails(50, 'newer_than:1d');
      const savedSummaries = await getSummaries();

      const summaries: AIResponse[] = [];

      for (const email of emails) {
        if (savedSummaries[email.id]) {
          const s = savedSummaries[email.id];
          summaries.push({
            summary: s.summary,
            priority: s.priority,
            sentiment: s.sentiment,
            category: s.category,
            actionItems: s.actionItems,
            needsReply: s.needsReply,
            suggestedReply: s.suggestedReply,
          });
        }
      }

      // Calculate stats
      const urgentCount = summaries.filter((s) => s.priority === 'urgent').length;
      const replyCount = summaries.filter((s) => s.needsReply).length;
      const actionCount = summaries.reduce(
        (acc, s) => acc + s.actionItems.length,
        0
      );
      const cats: Record<string, number> = {};
      summaries.forEach((s) => {
        cats[s.category] = (cats[s.category] || 0) + 1;
      });

      setStats({
        total: emails.length,
        urgent: urgentCount,
        needsReply: replyCount,
        actionItems: actionCount,
        categories: cats,
      });

      // Generate digest
      if (summaries.length > 0) {
        const digest = await generateDailyDigest(summaries, emails.length);
        setDigestText(digest);
      } else {
        setDigestText(
          'No summarized emails yet today. Tap "Summarize" on your inbox to get started.'
        );
      }
    } catch (error) {
      console.error('Failed to load digest:', error);
      setDigestText('Unable to generate digest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Generating your daily digest...</Text>
      </View>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Digest</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>{today}</Text>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Emails</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statNumber, { color: COLORS.urgent }]}>
              {stats.urgent}
            </Text>
            <Text style={styles.statLabel}>Urgent</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.statNumber, { color: COLORS.info }]}>
              {stats.needsReply}
            </Text>
            <Text style={styles.statLabel}>Need Reply</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats.actionItems}
            </Text>
            <Text style={styles.statLabel}>Actions</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {Object.keys(stats.categories).length > 0 && (
          <View style={styles.categoriesCard}>
            <Text style={styles.cardTitle}>📊 Categories</Text>
            {Object.entries(stats.categories)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <View key={category} style={styles.categoryRow}>
                  <Text style={styles.categoryName}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${(count / stats.total) * 100}%`,
                          backgroundColor: COLORS.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              ))}
          </View>
        )}

        {/* AI Digest */}
        <View style={styles.digestCard}>
          <Text style={styles.cardTitle}>✨ AI Digest</Text>
          <Text style={styles.digestText}>{digestText}</Text>
        </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: SPACING.sm,
    width: 60,
  },
  backText: {
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  date: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statCard: {
    width: '47%',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  statNumber: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  categoriesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryName: {
    width: 90,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 4,
    marginHorizontal: SPACING.md,
  },
  categoryFill: {
    height: 8,
    borderRadius: 4,
  },
  categoryCount: {
    width: 24,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
  },
  digestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.xl,
    ...SHADOWS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  digestText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 24,
  },
});
