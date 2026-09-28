import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { supabase } from '../lib/supabase';

interface AuthValue {
  session: Session | null;
  /** null mientras se recupera la sesión guardada: evita parpadeos al login. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Cubre login, logout, refresco del token y la vuelta del OAuth.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(translate(error.message));
      },

      async signUp(email, password, displayName) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          // El trigger del backend usa estos datos para crear el perfil.
          options: { data: { display_name: displayName } },
        });
        if (error) throw new Error(translate(error.message));
      },

      async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/app` },
        });
        if (error) throw new Error(translate(error.message));
      },

      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}

/** Los mensajes de Supabase llegan en inglés; aquí los traducimos. */
function translate(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Todavía no confirmaste tu correo. Revisa la bandeja de entrada.',
    'User already registered': 'Ya existe una cuenta con ese correo.',
    'Password should be at least 6 characters.': 'La contraseña necesita al menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Ese correo no tiene un formato válido.',
  };
  return map[message] ?? message;
}
