import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { typography } from '../../src/design-system/theme/typography';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import {
  PixelGlobeOnboarding,
  PixelHeroAlex,
  IconArrowRight,
  IconDatabase3D,
  IconNetworks3D,
  IconPhysics3D,
  IconTrophy,
} from '../../src/assets/registry/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: 'world',
    title: 'Un mundo de conocimiento te espera',
    subtitle:
      'Explora, aprende y supera misiones en diferentes materias mientras vives una aventura única.',
    badge: 'EXPLORACIÓN TOTAL',
  },
  {
    id: 'gamification',
    title: 'Aprendizaje Gamificado',
    subtitle:
      'Supera misiones, mantén tu racha diaria, gana gemas y desbloquea trofeos e insignias legendarias.',
    badge: 'LOGROS & RACHA',
  },
  {
    id: 'subjects',
    title: 'Múltiples Materias',
    subtitle:
      'Aprende Base de Datos, Redes de Computación y Física Eléctrica con laboratorios interactivos.',
    badge: 'CIENCIAS & TECNOLOGÍA',
  },
  {
    id: 'avatar',
    title: 'Personaje Personalizable',
    subtitle:
      'Diseña tu avatar pixel art con estilos cyber, accesorios, mochilas y efectos visuales únicos.',
    badge: 'ESTILO MODULAR',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLast = currentIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      router.replace('/(auth)/login');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const currentSlide = SLIDES[currentIndex];

  const renderVisual = () => {
    switch (currentIndex) {
      case 0:
        return <PixelGlobeOnboarding size={SCREEN_WIDTH * 0.72} />;
      case 1:
        return (
          <View style={styles.gamificationGraphicContainer}>
            <View style={styles.trophyHalo}>
              <IconTrophy size={110} color="#FFD53A" />
            </View>
            <View style={styles.statBadgesRow}>
              <View style={[styles.microBadge, { borderColor: '#FF8A2A' }]}>
                <Text style={styles.microBadgeText}>🔥 Racha x12</Text>
              </View>
              <View style={[styles.microBadge, { borderColor: '#19D3FF' }]}>
                <Text style={styles.microBadgeText}>💎 +280 XP</Text>
              </View>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.subjectsGraphicRow}>
            <View style={[styles.subjectOrb, { borderColor: '#19D3FF' }]}>
              <IconDatabase3D size={48} />
              <Text style={styles.orbLabel}>SQL</Text>
            </View>
            <View style={[styles.subjectOrb, { borderColor: '#2E5BFF' }]}>
              <IconNetworks3D size={48} />
              <Text style={styles.orbLabel}>Redes</Text>
            </View>
            <View style={[styles.subjectOrb, { borderColor: '#FFD53A' }]}>
              <IconPhysics3D size={48} />
              <Text style={styles.orbLabel}>Física</Text>
            </View>
          </View>
        );
      case 3:
      default:
        return <PixelHeroAlex size={SCREEN_WIDTH * 0.65} />;
    }
  };

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        {/* HEADER: Skip Button */}
        <View style={styles.header}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{currentSlide.badge}</Text>
          </View>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipButton}>
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        </View>

        {/* CENTER GRAPHIC */}
        <View style={styles.visualContainer}>{renderVisual()}</View>

        {/* TEXT CONTENT */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
        </View>

        {/* FOOTER: Dots & Next CTA */}
        <View style={styles.footer}>
          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrentIndex(i)}
                style={[styles.dot, i === currentIndex && styles.activeDot]}
              />
            ))}
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextButtonText}>{isLast ? 'Comenzar Ahora' : 'Siguiente'}</Text>
            <View style={styles.buttonArrowBadge}>
              <IconArrowRight color="#08142E" size={17} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(25, 211, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(25, 211, 255, 0.35)',
  },
  categoryBadgeText: {
    ...typography.gamerBadge,
    color: colors.cyan,
    fontSize: 9,
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    ...typography.bodyMedium,
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  gamificationGraphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyHalo: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 213, 58, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 213, 58, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  microBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#0A193B',
    borderWidth: 1.5,
  },
  microBadgeText: {
    ...typography.gamerBadge,
    color: '#FFFFFF',
    fontSize: 11,
  },
  subjectsGraphicRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectOrb: {
    width: 90,
    height: 110,
    borderRadius: radius.lg,
    backgroundColor: '#0A193B',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  orbLabel: {
    ...typography.gamerBadge,
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 8,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.gamerTitle,
    color: '#FFFFFF',
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 28,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
    fontSize: 13,
    maxWidth: 320,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#1E3A75',
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyan,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#8CEDFF',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    width: '100%',
  },
  nextButtonText: {
    ...typography.buttonLabel,
    color: '#08142E',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonArrowBadge: {
    marginLeft: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 12,
    padding: 3,
  },
});
