import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../src/design-system/theme/colors';
import { typography } from '../src/design-system/theme/typography';
import { spacing } from '../src/design-system/theme/spacing';
import { CosmicBackground } from '../src/design-system/components/CosmicBackground';
import { PixelAulaLogoFull, PixelHeroAlex, IconArrowRight } from '../src/assets/registry/SvgIcons';
import { useAuthStore } from '../src/stores/useAuthStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Floating hero character bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulsing CTA button glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleStartAdventure = () => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        {/* Floating background decorative mission badge */}
        <Animated.View style={[styles.topBadge, { opacity: fadeAnim }]}>
          <Text style={styles.topBadgeText}>✦ MISIÓN: CONOCIMIENTO • UN MUNDO SIN LÍMITES ✦</Text>
        </Animated.View>

        {/* LOGO SECTION */}
        <Animated.View style={[styles.logoSection, { opacity: fadeAnim }]}>
          <PixelAulaLogoFull width={SCREEN_WIDTH * 0.88} height={190} showSlogan />
          <Text style={styles.subtext}>Convierte el conocimiento en tu mejor aventura.</Text>
        </Animated.View>

        {/* HERO CHARACTER SECTION */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: bounceAnim }],
            },
          ]}
        >
          <PixelHeroAlex size={SCREEN_WIDTH * 0.65} />
        </Animated.View>

        {/* ACTION CTA BUTTON */}
        <Animated.View
          style={[
            styles.ctaSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.adventureButton}
            onPress={handleStartAdventure}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Comenzar Aventura</Text>
            <View style={styles.arrowBadge}>
              <IconArrowRight color="#08142E" size={18} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.versionText}>PIXELAULA v1.0 • APRENDIZAJE GAMIFICADO</Text>
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl + 10,
    paddingHorizontal: spacing.lg,
  },
  topBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(25, 211, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(25, 211, 255, 0.35)',
    marginTop: spacing.md,
  },
  topBadgeText: {
    ...typography.gamerBadge,
    color: colors.cyan,
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  subtext: {
    ...typography.bodyMedium,
    color: '#D1E6FF',
    textAlign: 'center',
    marginTop: -8,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  adventureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyan,
    paddingVertical: 15,
    paddingHorizontal: spacing.xxl,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#8CEDFF',
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
    width: '90%',
  },
  buttonText: {
    ...typography.buttonLabel,
    color: '#08142E',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  arrowBadge: {
    marginLeft: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12,
    padding: 3,
  },
  versionText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 8.5,
    letterSpacing: 1,
    opacity: 0.7,
  },
});
