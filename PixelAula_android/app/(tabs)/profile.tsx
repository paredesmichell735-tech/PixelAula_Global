import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { AvatarRenderer } from '../../src/features/avatar/AvatarRenderer';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelButton } from '../../src/design-system/components/PixelButton';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useMe } from '../../src/lib/queries';
import { IconFlame, IconGem, IconNavLogros } from '../../src/assets/registry/SvgIcons';

export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore(s => s.logout);
  const user = useMe().data;

  const handleLogout = () => {
    void logout();
    router.replace('/(auth)/login');
  };

  return (
    <CosmicBackground showNebula showStars>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* PROFILE HEADER */}
        <View style={styles.profileHeader}>
          {user?.avatar && <AvatarRenderer config={user.avatar} size={140} />}
          <Text style={styles.displayName}>{user?.displayName ?? '...'}</Text>
          <Text style={styles.username}>@{user?.username ?? '...'} • {user?.title ?? ''}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <IconFlame size={22} />
              <Text style={styles.statValue}>{user?.streakDays ?? 0} días</Text>
              <Text style={styles.statLabel}>RACHA</Text>
            </View>
            <View style={styles.statBox}>
              <IconGem size={22} />
              <Text style={styles.statValue}>{user?.gems ?? 0}</Text>
              <Text style={styles.statLabel}>GEMAS</Text>
            </View>
            <View style={styles.statBox}>
              <IconNavLogros size={22} color={colors.cyan} />
              <Text style={styles.statValue}>Nivel {user?.level ?? 1}</Text>
              <Text style={styles.statLabel}>RANGO</Text>
            </View>
          </View>
        </View>

        {/* QUICK MENU */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MI AVENTURA EDUCATIVA</Text>

          <PixelCard onPress={() => router.push('/progress')} style={styles.menuItem}>
            <Text style={styles.menuIcon}>📊</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Progreso Global</Text>
              <Text style={styles.menuSub}>Estadísticas semanales y tiempo de estudio</Text>
            </View>
          </PixelCard>

          <PixelCard onPress={() => router.push('/achievements')} style={styles.menuItem}>
            <Text style={styles.menuIcon}>🎖️</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Logros e Insignias</Text>
              <Text style={styles.menuSub}>Ver medallas de honor desbloqueadas</Text>
            </View>
          </PixelCard>

          <PixelCard onPress={() => router.push('/inventory')} style={styles.menuItem}>
            <Text style={styles.menuIcon}>🎒</Text>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Inventario</Text>
              <Text style={styles.menuSub}>Ropa, accesorios y efectos desbloqueados</Text>
            </View>
          </PixelCard>
        </View>

        <View style={styles.logoutSection}>
          <PixelButton title="CERRAR SESIÓN" onPress={handleLogout} variant="danger" fullWidth pill />
        </View>
      </ScrollView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.xxl + 20,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 24, 56, 0.8)',
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: '#1E3A75',
    marginBottom: spacing.xl,
  },
  displayName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
    fontWeight: '800',
  },
  username: {
    ...typography.bodyMedium,
    color: colors.cyan,
    marginTop: 2,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1A336E',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.gamerSub,
    color: colors.textPrimary,
    marginTop: 4,
    fontSize: 12,
  },
  statLabel: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 8.5,
    marginTop: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.gamerSub,
    color: colors.cyan,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 24, 56, 0.75)',
    borderWidth: 1.5,
    borderColor: '#1E3A75',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  menuSub: {
    ...typography.bodySmall,
    color: '#94A3B8',
    fontSize: 11,
  },
  logoutSection: {
    marginTop: spacing.xxl,
  },
});
