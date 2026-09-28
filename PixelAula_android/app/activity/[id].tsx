import type { Activity, ActivityAnswer, AnswerResult, MissionAttempt } from '@pixelaula/api';
import { PixelAulaError, messageFor } from '@pixelaula/api';
import { useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PixelButton } from '../../src/design-system/components/PixelButton';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { PixelProgressBar } from '../../src/design-system/components/PixelProgressBar';
import { colors } from '../../src/design-system/theme/colors';
import { radius } from '../../src/design-system/theme/radius';
import { spacing } from '../../src/design-system/theme/spacing';
import { typography } from '../../src/design-system/theme/typography';
import { ActivityRenderer } from '../../src/features/activities/ActivityRenderer';
import { api } from '../../src/lib/api';
import { invalidateProgress, useMission } from '../../src/lib/queries';

/**
 * Pantalla de misión. Mismo flujo que la web: el servidor manda el estado del
 * intento en cada respuesta y la app solo lo pinta. Aquí no se cuentan
 * aciertos ni puntos por nuestra cuenta.
 */
export default function MissionScreen() {
  const { id: missionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mission = useMission(missionId);

  const [attempt, setAttempt] = useState<MissionAttempt | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [answer, setAnswer] = useState<ActivityAnswer | null>(null);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [hint, setHint] = useState<{ text: string; level: number } | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** UUID por actividad: si la red falla y se reintenta, no cuenta dos veces. */
  const clientAttemptId = useRef<string>(Crypto.randomUUID());
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    setStarting(true);
    setError(null);

    api
      .startMission(missionId)
      .then(result => {
        if (cancelled) return;
        setAttempt(result.attempt);
        setActivity(result.activity);
        clientAttemptId.current = Crypto.randomUUID();
        startedAt.current = Date.now();
      })
      .catch(cause => { if (!cancelled) setError(cause); })
      .finally(() => { if (!cancelled) setStarting(false); });

    return () => { cancelled = true; };
  }, [missionId]);

  const advance = (result: AnswerResult) => {
    setAttempt(result.attempt);
    setFeedback(result);
    setHint(null);
    setExplanation(null);
    setAnswer(null);
    if (result.finished) {
      invalidateProgress(queryClient);
      setTimeout(() => router.replace(`/results/${result.attempt.id}`), 1200);
    }
  };

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (!attempt || !answer) return;
      advance(
        await api.answer(attempt.id, {
          clientAttemptId: clientAttemptId.current,
          answer,
          timeSpentMs: Date.now() - startedAt.current,
        }),
      );
    });

  const askHint = () =>
    run(async () => {
      if (!attempt) return;
      const result = await api.hint(attempt.id);
      setHint({ text: result.hint, level: result.hintLevel });
    });

  const skip = () => run(async () => { if (attempt) advance(await api.skipActivity(attempt.id)); });

  const explain = () =>
    run(async () => {
      if (!feedback?.answerId) return;
      setExplanation((await api.explainAnswer(feedback.answerId)).markdown);
    });

  const next = () => {
    if (!feedback?.nextActivity) return;
    setActivity(feedback.nextActivity);
    setFeedback(null);
    clientAttemptId.current = Crypto.randomUUID();
    startedAt.current = Date.now();
  };

  if (mission.isLoading || starting) return <PixelLoading message="PREPARANDO LA MISIÓN..." />;

  if (error && !attempt) {
    const message = error instanceof PixelAulaError ? messageFor(error.code, error.message) : 'No pudimos conectar con el servidor.';
    return <PixelErrorState message={message} onRetry={() => router.back()} />;
  }

  const total = attempt?.activityTotal ?? 0;
  const done = attempt?.activityIndex ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>✕ SALIR</Text>
        </TouchableOpacity>
        <Text style={styles.progressCounter}>
          {activity ? `ACTIVIDAD ${activity.index} / ${activity.total}` : 'MISIÓN'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.missionTitle}>{mission.data?.title}</Text>
        <PixelProgressBar progressPercent={total ? Math.round((done / total) * 100) : 0} />
        <Text style={styles.statsLine}>⭐ {attempt?.correctCount ?? 0} aciertos · 💎 {attempt?.hintsUsed ?? 0} pistas</Text>

        {(attempt?.objectives ?? []).length > 0 && (
          <View style={styles.objectives}>
            {attempt!.objectives.map(objective => (
              <Text key={objective.id} style={[styles.objective, objective.completed && styles.objectiveDone]}>
                {objective.completed ? '✓' : '○'} {objective.description}
              </Text>
            ))}
          </View>
        )}

        {activity && (
          <ActivityRenderer activity={activity} disabled={Boolean(feedback) || busy} onChange={setAnswer} />
        )}

        {hint && (
          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>PISTA {hint.level}</Text>
            <Text style={styles.hintText}>{hint.text}</Text>
          </View>
        )}

        {feedback && (
          <View style={[styles.feedbackBox, { borderColor: feedback.correct ? colors.success : colors.error }]}>
            <Text style={[styles.feedbackTitle, { color: feedback.correct ? colors.success : colors.error }]}>
              {feedback.correct ? '¡CORRECTO!' : 'TODAVÍA NO'}
            </Text>
            <Text style={styles.feedbackMessage}>{feedback.feedback}</Text>
            {explanation && <Text style={styles.explanation}>{explanation}</Text>}
          </View>
        )}

        {error && attempt ? (
          <Text style={styles.errorText}>
            {error instanceof PixelAulaError ? messageFor(error.code, error.message) : 'No pudimos conectar con el servidor.'}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {!feedback ? (
          <>
            <View style={styles.secondaryRow}>
              <PixelButton
                title={`PISTA (${activity?.hintsAvailable ?? 0}) −${activity?.hintCostGems ?? 1}💎`}
                variant="ghost"
                size="sm"
                onPress={askHint}
                disabled={busy || !activity || activity.hintsAvailable === 0}
              />
              <PixelButton title="SALTAR" variant="ghost" size="sm" onPress={skip} disabled={busy} />
            </View>
            <PixelButton
              title={busy ? 'COMPROBANDO...' : 'COMPROBAR RESPUESTA'}
              onPress={submit}
              disabled={!answer || busy}
              loading={busy}
              fullWidth
            />
          </>
        ) : feedback.finished ? (
          <Text style={styles.finishing}>PREPARANDO TUS RESULTADOS...</Text>
        ) : (
          <>
            {feedback.canExplain && !explanation && (
              <PixelButton title="¿POR QUÉ?" variant="ghost" size="sm" onPress={explain} disabled={busy} />
            )}
            <PixelButton title="CONTINUAR" onPress={next} variant={feedback.correct ? 'success' : 'primary'} fullWidth />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.surfaceBorder,
  },
  closeText: { ...typography.gamerBadge, color: colors.error },
  progressCounter: { ...typography.gamerBadge, color: colors.cyan },
  body: { padding: spacing.lg, gap: spacing.sm },
  missionTitle: { ...typography.h3, color: colors.textPrimary },
  statsLine: { ...typography.bodySmall, color: colors.textMuted },
  objectives: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  objective: { ...typography.bodySmall, color: colors.textSecondary },
  objectiveDone: { color: colors.success },
  hintBox: {
    backgroundColor: colors.yellow + '14',
    borderColor: colors.yellow,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  hintTitle: { ...typography.gamerBadge, color: colors.yellow, marginBottom: 4 },
  hintText: { ...typography.bodyMedium, color: colors.textPrimary },
  feedbackBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    marginVertical: spacing.sm,
  },
  feedbackTitle: { ...typography.h3, marginBottom: 4 },
  feedbackMessage: { ...typography.bodyMedium, color: colors.textPrimary },
  explanation: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  errorText: { ...typography.bodySmall, color: colors.error },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  finishing: { ...typography.gamerBadge, color: colors.success, textAlign: 'center' },
});
