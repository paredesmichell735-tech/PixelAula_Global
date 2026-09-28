import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/stores/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const init = useAuthStore(s => s.init);

  // Recupera la sesión guardada y escucha login, logout y refresco del token.
  useEffect(() => init(), [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#08142E" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#08142E' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subjects/[id]" />
          <Stack.Screen name="learning-map/[subjectId]" />
          <Stack.Screen name="activity/[id]" />
          <Stack.Screen name="results/[attemptId]" />
          <Stack.Screen name="achievements/index" />
          <Stack.Screen name="inventory/index" />
          <Stack.Screen name="progress/index" />
          <Stack.Screen name="leaderboard/index" />
          <Stack.Screen name="settings/index" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
