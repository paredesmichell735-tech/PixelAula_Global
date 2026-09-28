import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelButton } from '../../src/design-system/components/PixelButton';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { IconXP, IconCoins, IconStreak } from '../../src/assets/registry/SvgIcons';
import { useAttemptResult } from '../../src/lib/queries';

/** Resultado real del intento: lo calcula el servidor, aquí solo se pinta. */
export default function MissionResultsScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const result = useAttemptResult(attemptId);

  if (result.isLoading) return <PixelLoading message="CALCULANDO TUS RESULTADOS..." />;
  if (!result.data) {
    return <PixelErrorState message="No pudimos cargar el resultado." onRetry={() => router.replace('/(tabs)/home')} />;
  }

  const data = result.data;
  const answered = data.correctCount + data.wrongCount + data.skippedCount;
  const stars = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.starsText}>{stars}</Text>
        <Text style={styles.title}>
          {data.outcome === 'COMPLETED' ? '¡MISIÓN COMPLETADA!' : 'CASI LO TIENES'}
        </Text>
        <Text style={styles.subtitle}>{data.subjectName} · {data.missionTitle}</Text>
      </View>

      <PixelCard variant="glow" style={styles.summaryCard}>
        <Text style={styles.cardHeader}>RECOMPENSAS OBTENIDAS</Text>

        <View style={styles.rewardRow}>
          <View style={styles.rewardBadge}>
            <IconXP size={24} color={colors.xpGold} />
            <Text style={styles.rewardValue}>+{data.xpAwarded} XP</Text>
          </View>
          <View style={styles.rewardBadge}>
            <IconCoins size={24} color={colors.xpGold} />
            <Text style={styles.rewardValue}>+{data.coinsAwarded} PIXELES</Text>
          </View>
          {data.gemsAwarded > 0 && (
            <View style={styles.rewardBadge}>
              <IconStreak size={24} color={colors.streakFire} />
              <Text style={styles.rewardValue}>+{data.gemsAwarded} 💎</Text>
            </View>
          )}
        </View>

        {data.leveledUp && <Text style={styles.cardHeader}>¡SUBISTE AL NIVEL {data.newLevel}!</Text>}

        <View style={styles.divider} />

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data.accuracyPercent}%</Text>
            <Text style={styles.statLbl}>PRECISIÓN</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data.correctCount}/{answered}</Text>
            <Text style={styles.statLbl}>ACIERTOS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{data.score}</Text>
            <Text style={styles.statLbl}>PUNTOS</Text>
          </View>
        </View>

        {(data.unlockedAchievements.length > 0 || data.unlockedBadges.length > 0) && (
          <>
            <View style={styles.divider} />
            <Text style={styles.cardHeader}>DESBLOQUEADO</Text>
            {data.unlockedAchievements.map(a => (
              <Text key={a.id} style={styles.subtitle}>🏆 {a.title}</Text>
            ))}
            {data.unlockedBadges.map(b => (
              <Text key={b.id} style={styles.subtitle}>🏅 {b.title}</Text>
            ))}
          </>
        )}

        {data.teacherNote && (
          <>
            <View style={styles.divider} />
            <Text style={styles.cardHeader}>COMENTARIO DE TU PROFESOR</Text>
            <Text style={styles.subtitle}>👩‍🏫 {data.teacherNote}</Text>
          </>
        )}
      </PixelCard>

      <View style={styles.footerActions}>
        {data.nextMissionId ? (
          <PixelButton
            title="SIGUIENTE MISIÓN"
            onPress={() => router.replace(`/activity/${data.nextMissionId}`)}
            variant="primary"
            fullWidth
            size="lg"
          />
        ) : null}

        <PixelButton
          title="REPETIR MISIÓN"
          onPress={() => router.replace(`/activity/${data.missionId}`)}
          variant="secondary"
          fullWidth
          style={{ marginTop: spacing.sm }}
        />

        <PixelButton
          title="VOLVER AL INICIO"
          onPress={() => router.replace('/(tabs)/home')}
          variant="ghost"
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  starsText: {
    fontSize: 42,
    color: colors.xpGold,
    letterSpacing: 8,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.gamerTitle,
    color: colors.cyan,
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryCard: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.xl,
  },
  cardHeader: {
    ...typography.gamerBadge,
    color: colors.magenta,
    marginBottom: spacing.lg,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rewardBadge: {
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  rewardValue: {
    ...typography.gamerBadge,
    color: colors.textPrimary,
    marginTop: 4,
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    width: '100%',
    marginVertical: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    ...typography.gamerSub,
    color: colors.cyan,
  },
  statLbl: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 8,
    marginTop: 2,
  },
  footerActions: {
    width: '100%',
    marginTop: spacing.xxl,
  },
});
