import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { typography } from '../../src/design-system/theme/typography';
import { radius } from '../../src/design-system/theme/radius';
import { PixelTopBar } from '../../src/design-system/components/PixelTopBar';
import { SubjectMissionTile } from '../../src/design-system/components/SubjectMissionTile';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import {
  PixelHeroAlex,
  IconArrowRight,
  IconNavLogros,
  IconNavComunidad,
  IconNavCrea,
  IconNavAprende,
} from '../../src/assets/registry/SvgIcons';
import type { Subject } from '@pixelaula/api';
import { useDashboard } from '../../src/lib/queries';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  // Todo el panel en una llamada, igual que la web.
  const dashboard = useDashboard();
  const user = dashboard.data?.user;
  const subjects: Subject[] = dashboard.data?.subjects ?? [];
  const nextMission = dashboard.data?.activeMissions[0];
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await dashboard.refetch();
    setRefreshing(false);
  };

  /** El tile de la maqueta solo tiene tres dibujos; se elige por el icono de la materia. */
  const tileType = (icon: string): 'db' | 'networks' | 'physics' =>
    icon === 'database' ? 'db' : icon === 'network' ? 'networks' : 'physics';

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        {/* TOP BAR */}
        <PixelTopBar
          username={user?.displayName ?? '...'}
          streakDays={user?.streakDays ?? 0}
          gems={user?.gems ?? 0}
          onAvatarPress={() => router.push('/(tabs)/avatar')}
          onNotificationsPress={() => router.push('/achievements')}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.cyan}
            />
          }
        >
          {/* HERO ADVENTURE CARD (Direct Mockup 4) */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>¡Tu aventura comienza!</Text>
              <Text style={styles.heroSubtitle}>
                Explora materias, completa misiones y sigue construyendo tu historia.
              </Text>
            </View>

            {/* Visual Hero Alex */}
            <View style={styles.heroVisualContainer}>
              <PixelHeroAlex size={150} />
            </View>

            {/* Glowing Amber Action Button */}
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() =>
                nextMission
                  ? router.push(`/activity/${nextMission.id}`)
                  : router.push('/(tabs)/subjects')
              }
              activeOpacity={0.85}
            >
              <Text style={styles.heroButtonText}>Comenzar Aventura</Text>
              <View style={styles.heroButtonArrowBadge}>
                <IconArrowRight color="#08142E" size={17} />
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION: Elige tu primera misión (Mockup 4) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionMainTitle}>Elige tu primera misión</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/subjects')} activeOpacity={0.7}>
              <Text style={styles.sectionLink}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {/* 3 Subject Cards Horizontal Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.missionTilesScroll}
          >
            {subjects.slice(0, 3).map(subject => (
              <SubjectMissionTile
                key={subject.id}
                id={subject.id}
                name={subject.name}
                themeColor={subject.color}
                type={tileType(subject.icon)}
                onPress={() => router.push(`/learning-map/${subject.id}`)}
              />
            ))}
          </ScrollView>

          {/* VALUE PROPOSITION HIGHLIGHTS (Mockup bottom banner) */}
          <View style={styles.featuresSection}>
            {/* Feature 1 */}
            <TouchableOpacity
              style={[styles.featureCard, { borderColor: '#19D3FF' }]}
              onPress={() => router.push('/achievements')}
              activeOpacity={0.8}
            >
              <View style={styles.featureIconBadge}>
                <IconNavLogros size={26} color="#19D3FF" />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={[styles.featureTitle, { color: '#19D3FF' }]}>
                  APRENDIZAJE GAMIFICADO
                </Text>
                <Text style={styles.featureSubtitle}>
                  Misiones, logros e insignias exclusivas.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Feature 2 */}
            <TouchableOpacity
              style={[styles.featureCard, { borderColor: '#FFD53A' }]}
              onPress={() => router.push('/(tabs)/subjects')}
              activeOpacity={0.8}
            >
              <View style={styles.featureIconBadge}>
                <IconNavAprende size={26} color="#FFD53A" />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={[styles.featureTitle, { color: '#FFD53A' }]}>
                  MÚLTIPLES MATERIAS
                </Text>
                <Text style={styles.featureSubtitle}>
                  Tecnología, ciencias y más, en un solo lugar.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Feature 3 */}
            <TouchableOpacity
              style={[styles.featureCard, { borderColor: '#FF43D1' }]}
              onPress={() => router.push('/(tabs)/avatar')}
              activeOpacity={0.8}
            >
              <View style={styles.featureIconBadge}>
                <IconNavCrea size={26} color="#FF43D1" />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={[styles.featureTitle, { color: '#FF43D1' }]}>
                  PERSONAJE PERSONALIZABLE
                </Text>
                <Text style={styles.featureSubtitle}>
                  Combina, crea y sé único con tu avatar pixel art.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  heroCard: {
    backgroundColor: 'rgba(10, 24, 56, 0.85)',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: '#1E4694',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 290,
  },
  heroVisualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD53A',
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: '#FFF275',
    shadowColor: '#FFD53A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    width: '100%',
  },
  heroButtonText: {
    ...typography.buttonLabel,
    color: '#08142E',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroButtonArrowBadge: {
    marginLeft: spacing.sm,
    backgroundColor: 'rgba(8, 20, 46, 0.25)',
    borderRadius: 12,
    padding: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
    marginTop: spacing.xs,
    paddingHorizontal: 4,
  },
  sectionMainTitle: {
    ...typography.gamerTitle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionLink: {
    ...typography.bodySmall,
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  missionTilesScroll: {
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  featuresSection: {
    marginTop: spacing.lg,
    gap: spacing.sm + 2,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 24, 56, 0.75)',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  featureIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#07132B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    ...typography.gamerBadge,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  featureSubtitle: {
    ...typography.bodySmall,
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
});
