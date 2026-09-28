import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { typography } from '../../src/design-system/theme/typography';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import {
  PixelAulaLogoFull,
  IconEmail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconCheckboxChecked,
  IconCheckboxUnchecked,
  IconGoogle,
  IconApple,
  IconArrowRight,
} from '../../src/assets/registry/SvgIcons';
import { useAuthStore } from '../../src/stores/useAuthStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login, register } = useAuthStore();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    if (!email || !password || (mode === 'REGISTER' && !username)) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        await login(email.trim(), password);
        router.replace('/(tabs)/home');
      } else {
        const { needsConfirmation } = await register(email.trim(), password, username.trim());
        if (needsConfirmation) {
          setNotice('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
          setMode('LOGIN');
        } else {
          router.replace('/(tabs)/home');
        }
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // El acceso con Google y Apple en móvil necesita el enlace de retorno
  // configurado en Supabase; hasta entonces se avisa en vez de fingir un login.
  const handleSocial = (provider: string) => {
    setError(null);
    setNotice(`El acceso con ${provider} llega pronto. De momento usa tu correo.`);
  };

  return (
    <CosmicBackground showNebula showStars>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* LOGO HEADER */}
          <View style={styles.header}>
            <PixelAulaLogoFull width={SCREEN_WIDTH * 0.78} height={140} showSlogan />
          </View>

          {/* TAB SWITCHER: [ Iniciar Sesión ] [ Registrarse ] */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, mode === 'LOGIN' && styles.tabButtonActive]}
              onPress={() => setMode('LOGIN')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'LOGIN' && styles.tabTextActive]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, mode === 'REGISTER' && styles.tabButtonActive]}
              onPress={() => setMode('REGISTER')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'REGISTER' && styles.tabTextActive]}>
                Registrarse
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORM CARD */}
          <View style={styles.formContainer}>
            {mode === 'REGISTER' && (
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Nombre de usuario"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <IconEmail color={colors.cyan} size={19} />
              </View>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <IconLock color={colors.cyan} size={19} />
              </View>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <IconEyeOff color="#94A3B8" size={19} />
                ) : (
                  <IconEye color="#94A3B8" size={19} />
                )}
              </TouchableOpacity>
            </View>

            {/* Options Row: Recordarme & Forgot password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                {rememberMe ? <IconCheckboxChecked size={18} /> : <IconCheckboxUnchecked size={18} />}
                <Text style={styles.rememberText}>Recordarme</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorBox}>{error}</Text> : null}
            {notice ? <Text style={styles.noticeBox}>{notice}</Text> : null}

            {/* MAIN CTA BUTTON */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {loading
                  ? 'Conectando...'
                  : mode === 'LOGIN'
                  ? 'Iniciar Sesión'
                  : 'Crear Cuenta'}
              </Text>
              <View style={styles.buttonArrowBadge}>
                <IconArrowRight color="#08142E" size={16} />
              </View>
            </TouchableOpacity>

            {/* DIVIDER: o continúa con */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* SOCIAL BUTTONS */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocial('Google')}
              activeOpacity={0.8}
            >
              <View style={styles.socialIcon}>
                <IconGoogle size={20} />
              </View>
              <Text style={styles.socialText}>Continuar con Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocial('Apple')}
              activeOpacity={0.8}
            >
              <View style={styles.socialIcon}>
                <IconApple size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.socialText}>Continuar con Apple</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footerRow}>
            <Text style={styles.footerPrompt}>
              {mode === 'LOGIN' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            </Text>
            <TouchableOpacity
              onPress={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
              activeOpacity={0.7}
            >
              <Text style={styles.footerAction}>
                {mode === 'LOGIN' ? 'Crear cuenta' : 'Iniciar sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    color: '#FFC7F1',
    backgroundColor: 'rgba(255, 67, 209, 0.12)',
    borderWidth: 1,
    borderColor: colors.magenta,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  noticeBox: {
    color: '#BDFFF0',
    backgroundColor: 'rgba(68, 240, 192, 0.12)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#091533',
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#193068',
    width: '100%',
    maxWidth: 380,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#122D68',
    borderWidth: 1,
    borderColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  tabText: {
    ...typography.bodyMedium,
    color: '#8299C2',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091838',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#1C3775',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  inputIconContainer: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    ...typography.bodySmall,
    color: '#94A3B8',
    fontSize: 12,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
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
    marginBottom: spacing.lg,
  },
  submitButtonText: {
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E3A75',
  },
  dividerText: {
    ...typography.bodySmall,
    color: '#64748B',
    paddingHorizontal: spacing.md,
    fontSize: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#091838',
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#1F3C7E',
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  socialIcon: {
    marginRight: spacing.sm,
  },
  socialText: {
    ...typography.bodyMedium,
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerPrompt: {
    ...typography.bodySmall,
    color: '#94A3B8',
    fontSize: 13,
  },
  footerAction: {
    ...typography.bodySmall,
    color: colors.cyan,
    fontWeight: '700',
    fontSize: 13,
  },
});
