import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { EmailWithSummary, EmailAction } from '../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { formatDate, getPriorityLabel, getCategoryEmoji, getInitials, truncate } from '../utils/helpers';
import { getEmailActions } from '../services/aiService';
import { modifyEmail, sendReply } from '../services/gmailService';

interface EmailCardProps {
  email: EmailWithSummary;
  onPress: () => void;
}

export const EmailCard: React.FC<EmailCardProps> = ({ email, onPress }) => {
  const priority = email.summary?.priority || 'normal';
  const category = email.summary?.category;
  const [actions, setActions] = useState<EmailAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsLoaded, setActionsLoaded] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Load actions when summary is available
  useEffect(() => {
    if (email.summary && !actionsLoaded) {
      loadActions();
    }
  }, [email.summary]);

  const loadActions = async () => {
    setLoadingActions(true);
    try {
      const result = await getEmailActions(email);
      setActions(result);
      setActionsLoaded(true);
    } catch {
      // silently fail
    } finally {
      setLoadingActions(false);
    }
  };

  const executeAction = async (action: EmailAction) => {
    setExecutingAction(action.id);
    try {
      switch (action.type) {
        case 'reply':
          if (action.replyText && email.threadId) {
            await sendReply(
              email.threadId,
              email.from.email,
              email.subject,
              action.replyText
            );
            setActionFeedback(`Replied: "${action.label}"`);
          }
          break;
        case 'archive':
          await modifyEmail(email.id, [], ['INBOX']);
          setActionFeedback('Archived');
          break;
        case 'star':
          await modifyEmail(email.id, ['STARRED']);
          setActionFeedback('Starred');
          break;
        default:
          setActionFeedback(`${action.emoji} ${action.label}`);
      }
    } catch {
      setActionFeedback('Action failed');
    } finally {
      setExecutingAction(null);
      setTimeout(() => setActionFeedback(null), 2500);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, !email.isRead && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Priority indicator */}
      <View style={[styles.priorityBar, { backgroundColor: COLORS[priority] }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={styles.avatarText}>{getInitials(email.from.name)}</Text>
          </View>

          {/* Sender & time */}
          <View style={styles.headerInfo}>
            <View style={styles.senderRow}>
              <Text style={[styles.senderName, !email.isRead && styles.boldText]} numberOfLines={1}>
                {email.from.name}
              </Text>
              <Text style={styles.time}>{formatDate(email.receivedAt)}</Text>
            </View>
            <Text style={[styles.subject, !email.isRead && styles.boldText]} numberOfLines={1}>
              {email.subject}
            </Text>
            {email.accountId && email.accountId !== 'gmail-primary' && (
              <Text style={styles.accountBadge}>
                📬 {email.accountId.split('@')[0]}
              </Text>
            )}
          </View>
        </View>

        {/* AI Summary */}
        {email.summary ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>
              ✨ AI Summary
              {category ? ` ${getCategoryEmoji(category)}` : ''}
            </Text>
            <Text style={styles.summaryText} numberOfLines={2}>
              {email.summary.summary}
            </Text>

            {/* Tags row */}
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: COLORS[priority] + '20' }]}>
                <Text style={[styles.tagText, { color: COLORS[priority] }]}>
                  {getPriorityLabel(priority)}
                </Text>
              </View>
              {email.summary.needsReply && (
                <View style={[styles.tag, { backgroundColor: COLORS.info + '20' }]}>
                  <Text style={[styles.tagText, { color: COLORS.info }]}>↩️ Needs Reply</Text>
                </View>
              )}
              {email.summary.actionItems.length > 0 && (
                <View style={[styles.tag, { backgroundColor: COLORS.warning + '20' }]}>
                  <Text style={[styles.tagText, { color: COLORS.warning }]}>
                    ✅ {email.summary.actionItems.length} action{email.summary.actionItems.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.preview} numberOfLines={2}>
            {truncate(email.bodyPreview, 120)}
          </Text>
        )}

        {/* Smart Action Chips */}
        {actions.length > 0 && (
          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionChip,
                  action.type === 'reply' && styles.actionChipReply,
                  action.type === 'archive' && styles.actionChipArchive,
                ]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  executeAction(action);
                }}
                disabled={executingAction !== null}
                activeOpacity={0.7}
              >
                {executingAction === action.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Text style={styles.actionChipEmoji}>{action.emoji}</Text>
                    <Text style={styles.actionChipLabel}>{action.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading actions indicator */}
        {loadingActions && (
          <View style={styles.actionsLoading}>
            <ActivityIndicator size="small" color={COLORS.textLight} />
            <Text style={styles.actionsLoadingText}>Getting smart actions...</Text>
          </View>
        )}

        {/* Action feedback */}
        {actionFeedback && (
          <View style={styles.feedbackBanner}>
            <Text style={styles.feedbackText}>✓ {actionFeedback}</Text>
          </View>
        )}

        {/* Attachments indicator */}
        {email.hasAttachments && (
          <Text style={styles.attachment}>📎 Has attachments</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  unread: {
    backgroundColor: '#F0F7FF',
  },
  priorityBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.surface,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
  },
  time: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginLeft: SPACING.sm,
  },
  subject: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryBox: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  summaryText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  preview: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  attachment: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  accountBadge: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  actionChipReply: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '60',
  },
  actionChipArchive: {
    backgroundColor: COLORS.surfaceVariant,
    borderColor: COLORS.border,
  },
  actionChipEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  actionChipLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  actionsLoadingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
  },
  feedbackBanner: {
    marginTop: SPACING.sm,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  feedbackText: {
    fontSize: FONTS.sizes.xs,
    color: '#065F46',
    fontWeight: '600',
  },
});
