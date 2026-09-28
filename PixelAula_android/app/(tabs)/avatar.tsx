import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PixelAulaError, messageFor, type AvatarCategory, type AvatarConfig, type AvatarOption } from '@pixelaula/api';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { AvatarRenderer } from '../../src/features/avatar/AvatarRenderer';
import { PixelButton } from '../../src/design-system/components/PixelButton';
import { CosmicBackground } from '../../src/design-system/components/CosmicBackground';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { api } from '../../src/lib/api';
import { useAvatarCatalog, useMe, useSaveAvatar } from '../../src/lib/queries';

const errorText = (e: unknown) =>
  e instanceof PixelAulaError ? messageFor(e.code, e.message) : 'Algo salió mal. Intenta de nuevo.';

/**
 * Taller de avatar sobre el catálogo real. El config guarda ids de opción;
 * para pintar se traducen a su asset (color o clave de sprite).
 */
export default function AvatarScreen() {
  const me = useMe();
  const catalog = useAvatarCatalog();
  const save = useSaveAvatar();
  const [draft, setDraft] = useState<AvatarConfig | null>(null);
  const [activeTab, setActiveTab] = useState<AvatarCategory>('hairColor');
  const [notice, setNotice] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (me.data && !draft) setDraft(me.data.avatar);
  }, [me.data, draft]);

  const optionsById = useMemo(() => {
    const map = new Map<string, AvatarOption>();
    catalog.data?.categories.forEach(g => g.options.forEach(o => map.set(o.id, o)));
    return map;
  }, [catalog.data]);

  if (me.isLoading || catalog.isLoading || !draft) {
    if (me.isError || catalog.isError) {
      return <PixelErrorState message="No pudimos cargar tu avatar." onRetry={() => { void me.refetch(); void catalog.refetch(); }} />;
    }
    return <PixelLoading message="ABRIENDO EL TALLER..." />;
  }

  const renderConfig = Object.fromEntries(
    Object.entries(draft).map(([k, v]) => [k, optionsById.get(v)?.asset ?? v]),
  ) as unknown as AvatarConfig;

  const groups = catalog.data?.categories ?? [];
  const activeGroup = groups.find(g => g.category === activeTab) ?? groups[0];

  const pick = (option: AvatarOption) => {
    if (!option.owned) {
      setNotice(option.unlockCondition ?? `Se desbloquea por ${option.priceCoins} Pixeles en la tienda.`);
      return;
    }
    setNotice(null);
    setDraft({ ...draft, [option.category]: option.id });
  };

  const randomize = async () => {
    try {
      setDraft(await api.randomAvatar());
      setNotice(null);
    } catch (e) {
      setNotice(errorText(e));
    }
  };

  const handleSave = () => {
    save.mutate(draft, {
      onSuccess: () => {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      },
      onError: e => setNotice(errorText(e)),
    });
  };

  return (
    <CosmicBackground showNebula showStars>
      <View style={styles.container}>
        {/* TOP: AVATAR PREVIEW CANVAS */}
        <View style={styles.previewSection}>
          <Text style={styles.studioHeader}>TALLER DE AVATAR</Text>
          <View style={styles.avatarGlowCircle}>
            <AvatarRenderer config={renderConfig} size={190} />
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlChip} onPress={randomize} activeOpacity={0.75}>
              <Text style={styles.controlText}>🎲 ALEATORIO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlChip} onPress={() => { setDraft(me.data!.avatar); setNotice(null); }} activeOpacity={0.75}>
              <Text style={styles.controlText}>↺ RESTABLECER</Text>
            </TouchableOpacity>
          </View>
          {notice && <Text style={styles.controlText}>{notice}</Text>}
        </View>

        {/* TABS & SELECTION */}
        <View style={styles.editorSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.category}
                style={[styles.tabChip, activeGroup?.category === group.category && styles.tabChipActive]}
                onPress={() => setActiveTab(group.category)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeGroup?.category === group.category && { color: colors.cyan }]}>
                  {group.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* OPTIONS GRID */}
          <ScrollView contentContainerStyle={styles.optionsGrid} showsVerticalScrollIndicator={false}>
            {activeGroup?.options.map((opt) => {
              const isEquipped = draft[opt.category] === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionCard, isEquipped && styles.optionEquipped, !opt.owned && { opacity: 0.45 }]}
                  onPress={() => pick(opt)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.colorSample,
                      { backgroundColor: opt.asset.startsWith('#') ? opt.asset : colors.purple },
                    ]}
                  />
                  <Text style={styles.optionName}>{opt.owned ? opt.name : `🔒 ${opt.name}`}</Text>
                  {isEquipped && <Text style={styles.equippedBadge}>EQUIPADO</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.saveFooter}>
            <PixelButton
              title={savedSuccess ? '¡PERSONAJE GUARDADO!' : save.isPending ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              onPress={handleSave}
              variant={savedSuccess ? 'success' : 'primary'}
              fullWidth
              pill
            />
          </View>
        </View>
      </View>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(8, 20, 46, 0.75)',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1A336E',
  },
  studioHeader: {
    ...typography.gamerTitle,
    color: colors.cyan,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  avatarGlowCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  controlChip: {
    backgroundColor: '#091838',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#1E3A75',
  },
  controlText: {
    ...typography.gamerBadge,
    color: '#94A3B8',
    fontSize: 9,
  },
  editorSection: {
    flex: 1,
    paddingTop: spacing.md,
  },
  tabsScroll: {
    paddingHorizontal: spacing.lg,
    maxHeight: 40,
    marginBottom: spacing.md,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: '#091838',
    borderWidth: 1.5,
    borderColor: '#1E3A75',
    marginRight: spacing.sm,
  },
  tabChipActive: {
    borderColor: colors.cyan,
    backgroundColor: '#102B66',
  },
  tabText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 9,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  optionCard: {
    width: '47%',
    backgroundColor: '#091838',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#1E3A75',
    alignItems: 'center',
  },
  optionEquipped: {
    borderColor: colors.cyan,
    backgroundColor: '#102B66',
  },
  colorSample: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  optionName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 11,
  },
  equippedBadge: {
    ...typography.gamerBadge,
    color: colors.cyan,
    fontSize: 8,
    marginTop: 4,
  },
  saveFooter: {
    padding: spacing.lg,
    backgroundColor: 'rgba(8, 20, 46, 0.9)',
    borderTopWidth: 1.5,
    borderTopColor: '#1A336E',
  },
});
