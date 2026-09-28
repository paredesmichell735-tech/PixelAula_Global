import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [soundEffects, setSoundEffects] = React.useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← VOLVER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CONFIGURACIÓN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PixelCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Notificaciones de Misiones</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.cyan }} />
          </View>
        </PixelCard>

        <PixelCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Efectos de Sonido Gamer</Text>
            <Switch value={soundEffects} onValueChange={setSoundEffects} trackColor={{ true: colors.cyan }} />
          </View>
        </PixelCard>

        <Text style={styles.versionText}>PIXELAULA MOBILE • VERSIÓN 1.0.0 (RELEASE)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.lg,
  },
  backText: {
    ...typography.gamerBadge,
    color: colors.cyan,
  },
  headerTitle: {
    ...typography.gamerTitle,
    color: colors.textPrimary,
    fontSize: 16,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  versionText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
    fontSize: 9,
  },
});
