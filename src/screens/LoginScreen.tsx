import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Background gradient effect */}
      <View style={styles.topSection}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Logo and branding */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>📧</Text>
          </View>
          <Text style={styles.appName}>MailMind</Text>
          <Text style={styles.tagline}>AI-Powered Email Intelligence</Text>
        </View>
      </View>

      {/* Features */}
      <View style={styles.bottomSection}>
        <View style={styles.featuresContainer}>
          <FeatureItem
            emoji="✨"
            title="Smart Summaries"
            desc="AI reads & summarizes every email instantly"
          />
          <FeatureItem
            emoji="🎯"
            title="Priority Sorting"
            desc="Know what's urgent vs what can wait"
          />
          <FeatureItem
            emoji="⚡"
            title="Quick Actions"
            desc="Reply, archive, remind with one tap"
          />
          <FeatureItem
            emoji="📊"
            title="Daily Digest"
            desc="Evening summary of your entire day"
          />
        </View>

        {/* Sign in button */}
        <TouchableOpacity style={styles.googleButton} onPress={onLogin} activeOpacity={0.8}>
          <View style={styles.googleIconContainer}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          We only read email metadata & content for summarization.{'\n'}
          Your data never leaves your device permanently.
        </Text>

        {/* Coming soon */}
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            Microsoft Outlook & Yahoo Mail — Coming Soon
          </Text>
        </View>
      </View>
    </View>
  );
};

const FeatureItem: React.FC<{ emoji: string; title: string; desc: string }> = ({
  emoji,
  title,
  desc,
}) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <View style={styles.featureTextContainer}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  topSection: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -80,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -30,
    left: -40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: FONTS.sizes.title,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  bottomSection: {
    flex: 0.6,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: SPACING.md,
    width: 36,
    textAlign: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  featureDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  googleG: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: SPACING.lg,
    lineHeight: 16,
  },
  comingSoon: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
});
