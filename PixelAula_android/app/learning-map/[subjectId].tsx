import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { LevelNode } from '../../src/design-system/components/LevelNode';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import { useLearningMap } from '../../src/lib/queries';
import { LevelNodeData } from '../../src/models/Subject';

export default function LearningMapScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const router = useRouter();
  // El mapa completo llega en una llamada; aquí se toma la isla de esta materia.
  const map = useLearningMap();
  const nodes: LevelNodeData[] = map.data?.subjects.find(s => s.subject.id === subjectId)?.nodes ?? [];

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        <View style={styles.mapHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backText}>‹ VOLVER</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.mapTitle}>MAPA DE APRENDIZAJE</Text>
            <Text style={styles.mapSub}>Selecciona un nodo para iniciar la misión</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.mapCanvas} showsVerticalScrollIndicator={false}>
          <View style={styles.nodesContainer}>
            {/* SVG Connection Path */}
            <Svg width="100%" height="520" style={StyleSheet.absoluteFill}>
              <Path
                d="M 82 82 Q 212 152 112 252 T 232 352"
                stroke={colors.cyan}
                strokeWidth="4"
                strokeDasharray="8 6"
                fill="none"
              />
            </Svg>

            {nodes.map((node) => (
              <View
                key={node.id}
                style={[
                  styles.nodeWrapper,
                  // El backend manda la posición en porcentaje (0-100) de la isla.
                  { left: `${node.positionX}%`, top: `${node.positionY}%` },
                ]}
              >
                <LevelNode
                  levelNumber={node.levelNumber}
                  title={node.title}
                  status={node.status}
                  stars={node.stars}
                  onPress={() => {
                    if (node.status !== 'LOCKED') router.push(`/activity/${node.missionId}`);
                  }}
                />
                <Text style={styles.nodeLabel}>{node.title}</Text>
              </View>
            ))}
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
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(8, 20, 46, 0.85)',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1A336E',
  },
  backButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  backText: {
    ...typography.gamerBadge,
    color: colors.cyan,
    fontSize: 9,
  },
  mapTitle: {
    ...typography.gamerTitle,
    color: colors.cyan,
    fontSize: 16,
  },
  mapSub: {
    ...typography.bodySmall,
    color: '#94A3B8',
    fontSize: 11,
  },
  mapCanvas: {
    height: 600,
  },
  nodesContainer: {
    flex: 1,
    position: 'relative',
  },
  nodeWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeLabel: {
    ...typography.gamerBadge,
    color: colors.textPrimary,
    fontSize: 9,
    marginTop: 6,
    textAlign: 'center',
    backgroundColor: 'rgba(8, 20, 46, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#1E3A75',
  },
});
