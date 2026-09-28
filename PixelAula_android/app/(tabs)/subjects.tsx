import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { typography } from '../../src/design-system/theme/typography';
import { radius } from '../../src/design-system/theme/radius';
import { SubjectCard } from '../../src/design-system/components/SubjectCard';
import { PixelLoading } from '../../src/design-system/components/PixelLoading';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import { useSubjects } from '../../src/lib/queries';
import { Subject } from '../../src/models/Subject';

export default function SubjectsScreen() {
  const router = useRouter();
  const query = useSubjects();
  const subjects: Subject[] = query.data ?? [];
  const loading = query.isLoading;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'TODAS' | 'EN_CURSO' | 'COMPLETADAS'>('TODAS');

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'EN_CURSO') return matchesSearch && s.status === 'IN_PROGRESS';
    if (filter === 'COMPLETADAS') return matchesSearch && s.status === 'COMPLETED';
    return matchesSearch;
  });

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MATERIAS EDUCATIVAS</Text>
          <Text style={styles.subtitle}>Explora tu plan de estudio gamificado</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar materia (ej: Base de Datos, Redes)..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* FILTERS */}
        <View style={styles.filterRow}>
          {(['TODAS', 'EN_CURSO', 'COMPLETADAS'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, filter === f && { color: colors.cyan }]}>
                {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <PixelLoading message="CARGANDO MATERIAS..." />
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {filteredSubjects.map((item) => (
              <SubjectCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                icon={item.icon}
                color={item.color}
                level={item.level}
                progressPercent={item.progressPercent}
                currentXp={item.currentXp}
                requiredXp={item.requiredXp}
                onPress={() => router.push(`/learning-map/${item.id}`)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.gamerTitle,
    color: colors.cyan,
    fontSize: 18,
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: '#091838',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#1E3A75',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#091838',
    borderWidth: 1.5,
    borderColor: '#1E3A75',
  },
  filterChipActive: {
    borderColor: colors.cyan,
    backgroundColor: '#102B66',
  },
  filterText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 9,
  },
  list: {
    paddingBottom: spacing.xxl + 20,
  },
});
