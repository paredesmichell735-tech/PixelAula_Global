import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelButton } from '../../src/design-system/components/PixelButton';
import { PixelProgressBar } from '../../src/design-system/components/PixelProgressBar';
import { useSubject } from '../../src/lib/queries';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { Subject } from '../../src/models/Subject';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useSubject(id);
  const subject: Subject | undefined = query.data;

  if (query.isLoading) return <PixelLoading message="CARGANDO MATERIA..." />;
  if (!subject) return <PixelErrorState message="No encontramos esta materia." onRetry={() => router.back()} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PixelCard variant="glow" style={styles.heroCard}>
          <Text style={[styles.badge, { color: subject.color }]}>MATERIA</Text>
          <Text style={styles.title}>{subject.name}</Text>
          <Text style={styles.description}>{subject.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>NIVEL {subject.level}</Text>
              <Text style={styles.statLbl}>Rango Actual</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{subject.completedMissions}/{subject.totalMissions}</Text>
              <Text style={styles.statLbl}>Misiones</Text>
            </View>
          </View>

          <PixelProgressBar progressPercent={subject.progressPercent} barColor={subject.color} showLabel />
        </PixelCard>

        <PixelButton
          title="IR AL MAPA DE APRENDIZAJE"
          onPress={() => router.push(`/learning-map/${subject.id}`)}
          variant="primary"
          fullWidth
          size="lg"
        />
      </ScrollView>
    </View>
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
  heroCard: {
    marginBottom: spacing.xl,
  },
  badge: {
    ...typography.gamerBadge,
    marginBottom: 4,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  stat: {
    alignItems: 'center',
  },
  statVal: {
    ...typography.gamerSub,
    color: colors.textPrimary,
  },
  statLbl: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
