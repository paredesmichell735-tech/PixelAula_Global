import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { typography } from '../../src/design-system/theme/typography';
import { radius } from '../../src/design-system/theme/radius';
import { MissionCard } from '../../src/design-system/components/MissionCard';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import { useMissions } from '../../src/lib/queries';
import type { MissionSummary } from '@pixelaula/api';
import { Mission } from '../../src/models/Mission';

export default function MissionsScreen() {
  const router = useRouter();
  const query = useMissions();
  const missions: MissionSummary[] = query.data ?? [];
  const [filter, setFilter] = useState<'TODAS' | 'ACTIVAS' | 'COMPLETADAS'>('TODAS');

  const filteredMissions = missions.filter((m) => {
    if (filter === 'ACTIVAS') return m.status === 'ACTIVE';
    if (filter === 'COMPLETADAS') return m.status === 'COMPLETED';
    return true;
  });

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CENTRO DE MISIONES</Text>
          <Text style={styles.subtitle}>Completa retos educativos, sube de nivel y gana gemas</Text>
        </View>

        <View style={styles.filterRow}>
          {(['TODAS', 'ACTIVAS', 'COMPLETADAS'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f && { color: colors.cyan }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredMissions.map((item) => (
            <MissionCard
              key={item.id}
              id={item.id}
              subjectName={item.subjectName}
              title={item.title}
              description={item.description}
              difficulty={item.difficulty}
              xpReward={item.xpReward}
              coinsReward={item.coinsReward}
              status={item.status}
              onPress={() => router.push(`/activity/${item.id}`)}
            />
          ))}
        </ScrollView>
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.gamerTitle,
    color: colors.cyan,
    fontSize: 18,
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#94A3B8',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#091838',
    borderWidth: 1.5,
    borderColor: '#1E3A75',
  },
  filterChipActive: {
    borderColor: colors.cyan,
    backgroundColor: '#102B66',
  },
  filterText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 9,
  },
  list: {
    paddingBottom: spacing.xxl + 20,
  },
});
