import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { useAchievements, useBadges } from '../../src/lib/queries';
import { iconFor } from '../../src/lib/icons';

const TABS = ['TODOS', 'APRENDIZAJE', 'EXPLORACION', 'CONSTANCIA', 'CREATIVIDAD', 'ESPECIALES', 'INSIGNIAS'] as const;

/** Logros e insignias reales: el progreso lo calcula el servidor. */
export default function AchievementsScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<(typeof TABS)[number]>('TODOS');
  const achievements = useAchievements();
  const badges = useBadges();
  const query = activeCategory === 'INSIGNIAS' ? badges : achievements;

  const items =
    activeCategory === 'INSIGNIAS'
      ? (badges.data ?? []).map(b => ({ id: b.id, title: b.title, description: b.description, icon: b.icon, unlocked: b.unlocked, progress: null as string | null }))
      : (achievements.data ?? [])
          .filter(a => activeCategory === 'TODOS' || a.category === activeCategory)
          .map(a => ({
            id: a.id, title: a.title, description: a.description, icon: a.icon, unlocked: a.unlocked,
            progress: a.unlocked ? null : `${a.currentValue}/${a.targetValue} · ${a.progressPercent}%`,
          }));

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← VOLVER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LOGROS E INSIGNIAS</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {TABS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tabChip, activeCategory === cat && styles.tabChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && { color: colors.cyan }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {query.isLoading ? (
        <PixelLoading message="CARGANDO LOGROS..." />
      ) : query.isError ? (
        <PixelErrorState message="No pudimos cargar tus logros." onRetry={() => query.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <PixelCard key={item.id} style={[styles.card, !item.unlocked && { opacity: 0.5 }]}>
              <View style={styles.iconBox}>
                <Text style={styles.icon}>{iconFor(item.icon)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={[styles.statusText, { color: item.unlocked ? colors.success : colors.textMuted }]}>
                  {item.unlocked ? '✓ DESBLOQUEADO' : `🔒 ${item.progress ?? 'BLOQUEADO'}`}
                </Text>
              </View>
            </PixelCard>
          ))}
        </ScrollView>
      )}
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
  tabsRow: {
    paddingHorizontal: spacing.lg,
    maxHeight: 44,
    marginVertical: spacing.md,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.sm,
  },
  tabChipActive: {
    borderColor: colors.cyan,
    backgroundColor: colors.surfaceLight,
  },
  tabText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 9,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  statusText: {
    ...typography.gamerBadge,
    fontSize: 9,
  },
});
