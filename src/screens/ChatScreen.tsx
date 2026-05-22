import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { MarkdownText } from '../components/MarkdownText';
import { chatWithEmails } from '../services/aiService';
import { fetchEmails } from '../services/gmailService';
import { getLinkedAccounts } from '../services/accountService';
import { Email } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatScreenProps {
  onBack: () => void;
}

const QUICK_PROMPTS = [
  '📊 Summarize my emails this week',
  '🔴 What are my urgent emails?',
  '✅ List all action items from emails',
  '👥 Who emails me the most?',
  '💼 Any job-related emails?',
  '💰 Any finance or billing emails?',
];

export const ChatScreen: React.FC<ChatScreenProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailContext, setEmailContext] = useState<Email[]>([]);
  const [contextLoading, setContextLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Load email context on mount
  useEffect(() => {
    loadEmailContext();
  }, []);

  const loadEmailContext = async () => {
    setContextLoading(true);
    try {
      const accounts = await getLinkedAccounts();
      let allEmails: Email[] = [];

      if (accounts.length > 1) {
        const validAccounts = accounts.filter(
          (a) => a.accessToken && Date.now() < a.tokenExpiry
        );
        const results = await Promise.allSettled(
          validAccounts.map(async (account) => {
            const { emails } = await fetchEmails(50, 'newer_than:7d', undefined, account.token);
            return emails.map((e) => ({ ...e, accountId: account.email }));
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled') allEmails.push(...r.value);
        }
      } else {
        const { emails } = await fetchEmails(50, 'newer_than:7d');
        allEmails = emails;
      }

      allEmails.sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );

      setEmailContext(allEmails);

      // Welcome message
      const accountNames = accounts.map((a) => a.email.split('@')[0]).join(', ');
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `👋 Hi! I'm your MailMind AI assistant. I've loaded **${allEmails.length} emails** from the last 7 days${accounts.length > 1 ? ` across ${accounts.length} accounts (${accountNames})` : ''}.\n\nAsk me anything about your emails! Try:\n• "What urgent emails do I have?"\n• "Summarize my week"\n• "Any action items I'm missing?"`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to load email context:', error);
      setMessages([
        {
          id: 'error',
          role: 'system',
          content: 'Failed to load emails. Please go back and try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setContextLoading(false);
    }
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setLoading(true);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      try {
        // Build conversation history for context
        const history = messages
          .filter((m) => m.role !== 'system')
          .slice(-6) // Last 6 messages for context
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await chatWithEmails(text.trim(), emailContext, history);

        const assistantMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: 'Sorry, I had trouble processing that. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      }
    },
    [loading, messages, emailContext]
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>{isSystem ? '⚠️' : '🤖'}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : isSystem ? styles.systemBubble : styles.aiBubble,
          ]}
        >
          {isUser ? (
            <Text style={[styles.messageText, styles.userMessageText]} selectable>
              {item.content}
            </Text>
          ) : (
            <MarkdownText>{item.content}</MarkdownText>
          )}
          <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (contextLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your emails for AI context...</Text>
        <Text style={styles.loadingSubtext}>This helps me answer questions accurately</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>💬 MailMind AI</Text>
          <Text style={styles.headerSubtitle}>
            {emailContext.length} emails loaded • Gemini
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingIndicator}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>🤖</Text>
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Quick Prompts (show when no user messages yet) */}
      {messages.length <= 1 && (
        <View style={styles.quickPromptsContainer}>
          <Text style={styles.quickPromptsTitle}>Quick questions:</Text>
          <View style={styles.quickPromptsRow}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.quickPrompt}
                onPress={() => sendMessage(prompt)}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your emails..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(inputText)}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.xl },
  loadingText: { marginTop: SPACING.lg, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center' },
  loadingSubtext: { marginTop: SPACING.sm, fontSize: FONTS.sizes.sm, color: COLORS.textLight, textAlign: 'center' },
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
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  messagesList: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  messageRow: { flexDirection: 'row', marginBottom: SPACING.lg, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  aiAvatarText: { fontSize: 16 },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: '#FEF3C7',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  userMessageText: { color: '#FFFFFF' },
  messageTime: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  userMessageTime: { color: 'rgba(255,255,255,0.6)' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  typingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginLeft: SPACING.sm },
  quickPromptsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  quickPromptsTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickPrompt: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    ...SHADOWS.sm,
  },
  quickPromptText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { fontSize: 20, color: '#FFFFFF' },
});
