import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { PixelAulaError, messageFor } from '@pixelaula/api';
import { colors } from '../../src/design-system/theme/colors';
import { spacing } from '../../src/design-system/theme/spacing';
import { radius } from '../../src/design-system/theme/radius';
import { typography } from '../../src/design-system/theme/typography';
import { PixelCard } from '../../src/design-system/components/PixelCard';
import { PixelErrorState, PixelLoading } from '../../src/design-system/components/PixelLoading';
import { useEquipItem, useInventory, useMe, usePurchase, useShopItems } from '../../src/lib/queries';
import { iconFor } from '../../src/lib/icons';

const TABS = ['TODO', 'ROPA', 'ACCESORIOS', 'MOCHILAS', 'MASCOTAS', 'EFECTOS', 'TIENDA'];

export default function InventoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('TODO');
  const [notice, setNotice] = useState<string | null>(null);
  const me = useMe();
  const inventory = useInventory();
  const shop = useShopItems();
  const equip = useEquipItem();
  const purchase = usePurchase();
  const inShop = filter === 'TIENDA';
  const query = inShop ? shop : inventory;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return colors.rarityCommon;
      case 'UNCOMMON': return colors.rarityUncommon;
      case 'RARE': return colors.rarityRare;
      case 'EPIC': return colors.rarityEpic;
      case 'LEGENDARY': return colors.rarityLegendary;
      default: return colors.rarityCommon;
    }
  };

  const onError = (e: unknown) =>
    setNotice(e instanceof PixelAulaError ? messageFor(e.code, e.message) : 'Algo salió mal. Intenta de nuevo.');

  const owned = (inventory.data ?? []).filter((item) => filter === 'TODO' || item.category === filter);
  const forSale = shop.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← VOLVER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          INVENTARIO · 🪙 {me.data?.pixelsCoins ?? 0} · 💎 {me.data?.gems ?? 0}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {TABS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tabChip, filter === cat && styles.tabChipActive]}
            onPress={() => { setFilter(cat); setNotice(null); }}
          >
            <Text style={[styles.tabText, filter === cat && { color: colors.cyan }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {notice && <Text style={[styles.equippedTag, { marginBottom: spacing.sm }]}>{notice}</Text>}

      {query.isLoading ? (
        <PixelLoading message="CARGANDO OBJETOS..." />
      ) : query.isError ? (
        <PixelErrorState message="No pudimos cargar tus objetos." onRetry={() => query.refetch()} />
      ) : inShop ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {forSale.map((item) => (
            <TouchableOpacity
              key={item.id}
              disabled={item.owned || purchase.isPending}
              onPress={() => purchase.mutate(item.id, {
                onSuccess: () => setNotice(`¡Compraste ${item.name}!`),
                onError,
              })}
            >
              <PixelCard style={[styles.card, { borderColor: getRarityColor(item.rarity) }, item.owned && { opacity: 0.5 }]}>
                <Text style={styles.icon}>{iconFor(item.icon)}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) + '33' }]}>
                  <Text style={[styles.rarityText, { color: getRarityColor(item.rarity) }]}>{item.rarity}</Text>
                </View>
                <Text style={styles.equippedTag}>
                  {item.owned ? '✓ TUYO' : item.priceGems > 0 ? `💎 ${item.priceGems}` : `🪙 ${item.priceCoins}`}
                </Text>
              </PixelCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {owned.length === 0 && <Text style={styles.name}>Aún no tienes objetos aquí. Visita la TIENDA.</Text>}
          {owned.map((item) => (
            <TouchableOpacity
              key={item.id}
              disabled={item.equipped || equip.isPending}
              onPress={() => equip.mutate(item.id, { onError })}
            >
              <PixelCard style={[styles.card, { borderColor: getRarityColor(item.rarity) }]}>
                <Text style={styles.icon}>{iconFor(item.icon)}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) + '33' }]}>
                  <Text style={[styles.rarityText, { color: getRarityColor(item.rarity) }]}>{item.rarity}</Text>
                </View>
                <Text style={styles.equippedTag}>{item.equipped ? '✓ EQUIPADO' : 'TOCA PARA EQUIPAR'}</Text>
              </PixelCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.surfaceBorder,
    gap: spacing.lg,
  },
  backText: {
    ...typography.gamerBadge,
    color: colors.cyan,
  },
  headerTitle: {
    ...typography.gamerTitle,
    color: colors.textPrimary,
    fontSize: 16,
  },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    maxHeight: 44,
    marginVertical: spacing.md,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.sm,
  },
  tabChipActive: {
    borderColor: colors.cyan,
    backgroundColor: colors.surfaceLight,
  },
  tabText: {
    ...typography.gamerBadge,
    color: colors.textMuted,
    fontSize: 9,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.md,
  },
  icon: {
    fontSize: 36,
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  rarityText: {
    ...typography.gamerBadge,
    fontSize: 8,
  },
  equippedTag: {
    ...typography.gamerBadge,
    color: colors.cyan,
    fontSize: 8,
    marginTop: 6,
  },
});
