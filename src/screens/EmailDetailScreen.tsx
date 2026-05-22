import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { MarkdownText } from '../components/MarkdownText';
import { EmailWithSummary } from '../types';
import { formatDate, getPriorityLabel, getCategoryEmoji } from '../utils/helpers';
import { generateSmartReply } from '../services/aiService';
import { sendReply, archiveEmail, trashEmail, markAsRead } from '../services/gmailService';

interface EmailDetailScreenProps {
  email: EmailWithSummary;
  onBack: () => void;
}

export const EmailDetailScreen: React.FC<EmailDetailScreenProps> = ({
  email,
  onBack,
}) => {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [generatingReply, setGeneratingReply] = useState(false);
  const [sending, setSending] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleSmartReply = async (
    tone: 'professional' | 'casual' | 'friendly' | 'formal'
  ) => {
    setGeneratingReply(true);
    setShowReplyBox(true);
    const reply = await generateSmartReply(email, tone);
    setReplyText(reply);
    setGeneratingReply(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    const success = await sendReply(
      email.threadId || '',
      email.from.email,
      email.subject,
      replyText
    );
    setSending(false);
    if (success) {
      Alert.alert('Sent!', 'Your reply has been sent.');
      setShowReplyBox(false);
      setReplyText('');
    } else {
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    }
  };

  const handleArchive = async () => {
    const success = await archiveEmail(email.id);
    if (success) {
      Alert.alert('Archived', 'Email moved to archive.');
      onBack();
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Email', 'Are you sure you want to delete this email?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await trashEmail(email.id);
          if (success) onBack();
        },
      },
    ]);
  };

  // Mark as read when viewing
  React.useEffect(() => {
    if (!email.isRead) {
      markAsRead(email.id);
    }
  }, [email.id, email.isRead]);

  const summary = email.summary;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleArchive} style={styles.actionIcon}>
            <Text>📁</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.actionIcon}>
            <Text>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <Text style={styles.subject}>{email.subject}</Text>

        {/* Sender info */}
        <View style={styles.senderRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {email.from.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{email.from.name}</Text>
            <Text style={styles.senderEmail}>{email.from.email}</Text>
          </View>
          <Text style={styles.date}>{formatDate(email.receivedAt)}</Text>
        </View>

        {/* AI Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>✨ AI Summary</Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: COLORS[summary.priority] + '20' },
                ]}
              >
                <Text
                  style={[styles.priorityText, { color: COLORS[summary.priority] }]}
                >
                  {getPriorityLabel(summary.priority)}
                </Text>
              </View>
            </View>

            <MarkdownText>{summary.summary}</MarkdownText>

            {/* Category & Sentiment */}
            <View style={styles.metaRow}>
              {summary.category && (
                <View style={styles.metaTag}>
                  <Text style={styles.metaTagText}>
                    {getCategoryEmoji(summary.category)} {summary.category}
                  </Text>
                </View>
              )}
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>
                  {summary.sentiment === 'positive'
                    ? '😊'
                    : summary.sentiment === 'negative'
                      ? '😟'
                      : summary.sentiment === 'urgent'
                        ? '⚡'
                        : '😐'}{' '}
                  {summary.sentiment}
                </Text>
              </View>
            </View>

            {/* Action Items */}
            {summary.actionItems.length > 0 && (
              <View style={styles.actionItemsContainer}>
                <Text style={styles.actionItemsTitle}>📋 Action Items</Text>
                {summary.actionItems.map((item, index) => (
                  <View key={index} style={styles.actionItem}>
                    <Text style={styles.actionCheckbox}>☐</Text>
                    <Text style={styles.actionItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggested Reply */}
            {summary.suggestedReply && (
              <View style={styles.suggestedReplyContainer}>
                <Text style={styles.suggestedReplyTitle}>💡 Suggested Reply</Text>
                <Text style={styles.suggestedReplyText}>
                  {summary.suggestedReply}
                </Text>
                <TouchableOpacity
                  style={styles.useReplyButton}
                  onPress={() => {
                    setReplyText(summary.suggestedReply || '');
                    setShowReplyBox(true);
                  }}
                >
                  <Text style={styles.useReplyButtonText}>Use This Reply</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSmartReply('professional')}
            >
              <Text style={styles.actionEmoji}>💼</Text>
              <Text style={styles.actionLabel}>Professional</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSmartReply('casual')}
            >
              <Text style={styles.actionEmoji}>😊</Text>
              <Text style={styles.actionLabel}>Casual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSmartReply('friendly')}
            >
              <Text style={styles.actionEmoji}>🤝</Text>
              <Text style={styles.actionLabel}>Friendly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSmartReply('formal')}
            >
              <Text style={styles.actionEmoji}>📝</Text>
              <Text style={styles.actionLabel}>Formal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reply Box */}
        {showReplyBox && (
          <View style={styles.replyBox}>
            <Text style={styles.replyBoxTitle}>✉️ Reply</Text>
            {generatingReply ? (
              <View style={styles.replyLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.replyLoadingText}>
                  AI is drafting your reply...
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.replyInput}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  placeholder="Type your reply..."
                  placeholderTextColor={COLORS.textLight}
                  textAlignVertical="top"
                />
                <View style={styles.replyActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowReplyBox(false);
                      setReplyText('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendButton, sending && styles.sendingButton]}
                    onPress={handleSendReply}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.sendButtonText}>Send ↗️</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Email Body */}
        <View style={styles.emailBodySection}>
          <TouchableOpacity
            style={styles.originalToggle}
            onPress={() => setShowOriginal(!showOriginal)}
          >
            <Text style={styles.originalToggleText}>
              {showOriginal ? '▲ Hide' : '▼ Show'} Email Body
            </Text>
          </TouchableOpacity>

          {showOriginal && (
            <View style={styles.originalEmail}>
              <MarkdownText>{email.body || email.bodyPreview || 'No content available'}</MarkdownText>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
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
  },
  backText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionIcon: {
    padding: SPACING.sm,
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  subject: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xl,
    lineHeight: 28,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: '#FFF',
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  senderEmail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  priorityText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  metaTag: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  metaTagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  actionItemsContainer: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  actionItemsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  actionCheckbox: {
    fontSize: FONTS.sizes.lg,
    marginRight: SPACING.sm,
    color: COLORS.primary,
  },
  actionItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  suggestedReplyContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: '#F0F7FF',
    borderRadius: BORDER_RADIUS.md,
  },
  suggestedReplyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  suggestedReplyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  useReplyButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  useReplyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: FONTS.sizes.sm,
  },
  quickActions: {
    marginTop: SPACING.xl,
  },
  quickActionsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  actionLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  replyBox: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  replyBoxTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  replyLoading: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  replyLoadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 120,
    lineHeight: 22,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
  },
  sendingButton: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: FONTS.sizes.md,
  },
  originalToggle: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
  },
  originalToggleText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emailBodySection: {
    marginTop: SPACING.xl,
  },
  originalEmail: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
