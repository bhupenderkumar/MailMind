import React from 'react';
import { StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface MarkdownTextProps {
  children: string;
  light?: boolean;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ children, light }) => {
  const styles = light ? lightMarkdownStyles : darkMarkdownStyles;
  return <Markdown style={styles}>{children}</Markdown>;
};

const baseStyles = {
  body: {
    fontSize: FONTS.sizes.md,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  paragraph: {
    marginBottom: SPACING.sm,
    marginTop: 0,
  },
  strong: {
    fontWeight: '700' as const,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  bullet_list: {
    marginBottom: SPACING.sm,
  },
  ordered_list: {
    marginBottom: SPACING.sm,
  },
  list_item: {
    marginBottom: 4,
    flexDirection: 'row' as const,
  },
  bullet_list_icon: {
    marginRight: SPACING.xs,
    fontSize: 8,
    lineHeight: 22,
  },
  code_inline: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontFamily: 'monospace',
    fontSize: FONTS.sizes.sm,
  },
  fence: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    fontFamily: 'monospace',
    fontSize: FONTS.sizes.sm,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.primary + '08',
    borderRadius: 4,
    padding: SPACING.sm,
  },
  hr: {
    backgroundColor: COLORS.border,
    height: 1,
    marginVertical: SPACING.md,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginVertical: SPACING.sm,
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  td: {
    padding: SPACING.sm,
  },
  th: {
    padding: SPACING.sm,
    fontWeight: '700' as const,
    backgroundColor: '#F8FAFC',
  },
};

const darkMarkdownStyles = StyleSheet.create({
  ...baseStyles,
  body: { ...baseStyles.body, color: COLORS.text },
  heading1: { ...baseStyles.heading1, color: COLORS.text },
  heading2: { ...baseStyles.heading2, color: COLORS.text },
  heading3: { ...baseStyles.heading3, color: COLORS.text },
  strong: { ...baseStyles.strong, color: COLORS.text },
});

const lightMarkdownStyles = StyleSheet.create({
  ...baseStyles,
  body: { ...baseStyles.body, color: '#FFFFFF' },
  heading1: { ...baseStyles.heading1, color: '#FFFFFF' },
  heading2: { ...baseStyles.heading2, color: '#FFFFFF' },
  heading3: { ...baseStyles.heading3, color: '#FFFFFF' },
  strong: { ...baseStyles.strong, color: '#FFFFFF' },
  bullet_list_icon: { ...baseStyles.bullet_list_icon, color: '#FFFFFF' },
  code_inline: { ...baseStyles.code_inline, backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' },
});
