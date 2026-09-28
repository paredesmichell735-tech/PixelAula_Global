import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { useLeaderboard } from '../../src/lib/queries';
import type { LeaderboardPeriod, LeaderboardScope } from '@pixelaula/api';

const TABS: Record<string, { scope: LeaderboardScope; period: LeaderboardPeriod; empty: string }> = {
  SEMANAL: { scope: 'global', period: 'week', empty: 'Aún no hay puntuaciones esta semana.' },
  MENSUAL: { scope: 'global', period: 'month', empty: 'Aún no hay puntuaciones este mes.' },
  CLASE: { scope: 'class', period: 'week', empty: 'Únete a una clase para ver este ranking.' },
  AMIGOS: { scope: 'friends', period: 'week', empty: 'Agrega amigos para competir.' },
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('SEMANAL');
  const query = useLeaderboard(TABS[tab].scope, TABS[tab].period);
  const entries = query.data?.entries ?? [];
  const me = query.data?.me;
  // Si el usuario no entra en el top, su fila se pinta al final.
  const rows = me && !entries.some(e => e.userId === me.userId) ? [...entries, me] : entries;

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← VOLVER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RANKING DE ESTUDIANTES</Text>
      </View>

      <View style={styles.tabsRow}>
        {Object.keys(TABS).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, tab === t && styles.tabChipActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && { color: colors.cyan }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {query.isLoading ? (
        <PixelLoading message="CARGANDO RANKING..." />
      ) : query.isError ? (
        <PixelErrorState message="No pudimos cargar el ranking." onRetry={() => query.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.length === 0 && <Text style={styles.userSub}>{TABS[tab].empty}</Text>}
          {rows.map((item) => {
            const isUser = item.isCurrentUser || item.userId === me?.userId;
            return (
              <PixelCard
                key={item.userId}
                variant={isUser ? 'glow' : 'default'}
                style={[styles.rankRow, isUser && styles.userRow]}
              >
                <Text style={styles.rankNum}>#{item.rank}</Text>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, isUser && { color: colors.cyan }]}>
                    {item.displayName}{isUser ? ' (Tú)' : ''}
                  </Text>
                  <Text style={styles.userSub}>Nivel {item.level} • 🔥 {item.streakDays}d</Text>
                </View>
                <Text style={styles.xpVal}>{item.xp} XP</Text>
              </PixelCard>
            );
          })}
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  userRow: {
    borderColor: colors.cyan,
  },
  rankNum: {
    ...typography.gamerTitle,
    color: colors.xpGold,
    width: 40,
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  userSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  xpVal: {
    ...typography.gamerBadge,
    color: colors.xpGold,
  },
});
