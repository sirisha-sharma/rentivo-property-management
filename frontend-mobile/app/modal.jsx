import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COLORS } from '../constants/theme';

export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.heroBadge} />
      <ThemedText type="title" style={styles.title}>Rentivo Modal</ThemedText>
      <ThemedText style={styles.subtitle}>
        Temporary actions now follow the same dark premium surface language as the rest of the app.
      </ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link" style={styles.linkText}>Back to dashboard</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(47,123,255,0.24)',
    marginBottom: 20,
  },
  title: {
    color: COLORS.foreground,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: COLORS.mutedForeground,
    lineHeight: 22,
  },
  link: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkText: {
    fontWeight: '700',
  },
});
