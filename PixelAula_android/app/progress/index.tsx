import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelProgressBar } from '../../src/design-system/components/PixelProgressBar';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { useMe, useProgress, useSubjects } from '../../src/lib/queries';

export default function ProgressScreen() {
  const router = useRouter();
  const me = useMe();
  const progress = useProgress();
  const subjects = useSubjects();

  if (me.isLoading || progress.isLoading) return <PixelLoading message="CARGANDO PROGRESO..." />;
  if (!me.data || !progress.data) {
    return <PixelErrorState message="No pudimos cargar tu progreso." onRetry={() => { void me.refetch(); void progress.refetch(); }} />;
  }

  const user = me.data;
  const stats = progress.data;
  const levelPercent = user.requiredXp > 0 ? Math.round((user.currentXp / user.requiredXp) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← VOLVER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROGRESO EDUCATIVO</Text>
      </View>

      <PixelCard variant="glow" style={styles.heroCard}>
        <Text style={styles.heroLbl}>NIVEL GLOBAL</Text>
        <Text style={styles.heroVal}>NIVEL {user.level} • {user.title.toUpperCase()}</Text>
        <PixelProgressBar progressPercent={levelPercent} barColor={colors.cyan} showLabel />
        <Text style={styles.heroLbl}>
          {stats.totalXp} XP · {stats.completedMissionsCount} misiones · {stats.unlockedAchievementsCount} logros · 🔥 {stats.streakDays}d
        </Text>
      </PixelCard>

      <Text style={styles.sectionTitle}>PROGRESO POR MATERIA</Text>
      {(subjects.data ?? []).map((subject) => (
        <PixelCard key={subject.id} style={styles.subjectRow}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <PixelProgressBar progressPercent={subject.progressPercent} barColor={subject.color} showLabel />
        </PixelCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  heroCard: {
    marginBottom: spacing.xl,
  },
  heroLbl: {
    ...typography.gamerBadge,
    color: colors.magenta,
  },
  heroVal: {
    ...typography.h2,
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  sectionTitle: {
    ...typography.gamerSub,
    color: colors.cyan,
    marginBottom: spacing.sm,
  },
  subjectRow: {
    marginBottom: spacing.md,
  },
  subjectName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});
