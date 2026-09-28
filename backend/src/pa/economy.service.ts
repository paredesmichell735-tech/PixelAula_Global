import type { InventoryItem, PurchaseResult, ShopItem } from '@pixelaula/api';
import { err } from '../lib/errors.js';
import { rpc } from '../lib/supabase.js';
import { toShopItem } from './mappers.js';
import { avatar, economy, meta, personal, profiles } from './repo.js';
import type { ShopItemRow } from './rows.js';

/**
 * Tienda e inventario. Las compras van por `pa_purchase_item`, que descuenta
 * la moneda y suma el objeto en la misma transacción: o pasan las dos cosas o
 * no pasa ninguna.
 */

function toInventoryItem(item: ShopItemRow, owned: boolean, equipped: boolean): InventoryItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category === 'CONSUMIBLE' ? 'ACCESORIOS' : item.category,
    rarity: item.rarity,
    icon: item.icon,
    equipped,
    owned,
    price: item.price_coins,
  };
}

export async function listShopItems(userId: string): Promise<ShopItem[]> {
  const [items, inventory] = await Promise.all([economy.items(), economy.inventory(userId)]);
  const owned = new Set(inventory.map(i => i.item_id));
  return items.map(i => toShopItem(i, owned.has(i.id)));
}

export async function purchase(
  userId: string,
  body: { itemId: string; quantity: number; currency: 'COINS' | 'GEMS' },
): Promise<PurchaseResult> {
  const item = await economy.item(body.itemId);
  if (!item) throw err.notFound('Objeto');

  const result = await rpc<PurchaseResult>('pa_purchase_item', {
    p_user_id: userId,
    p_item_id: body.itemId,
    p_quantity: body.quantity,
    p_currency: body.currency,
  });

  await personal.addFeed(userId, 'MISSION_COMPLETED', `Compraste "${item.name}"`, '', item.icon);
  return result;
}

export async function listInventory(
  userId: string,
  filter: { category?: string; ownedOnly?: boolean } = {},
): Promise<InventoryItem[]> {
  const rows = await economy.inventory(userId);
  return rows
    .filter(r => !filter.category || r.item.category === filter.category)
    .map(r => toInventoryItem(r.item, true, r.equipped));
}

export async function equipItem(userId: string, itemId: string): Promise<InventoryItem> {
  const entry = await economy.inventoryEntry(userId, itemId);
  if (!entry || entry.quantity < 1) throw err.itemNotOwned();

  // Solo una pieza equipada por categoría.
  const rows = await economy.inventory(userId);
  for (const row of rows) {
    if (row.item.category === entry.item.category && row.equipped) {
      await economy.setEquipped(userId, row.item_id, false);
    }
  }
  await economy.setEquipped(userId, itemId, true);

  // Si el objeto corresponde a una pieza de avatar, queda desbloqueada.
  if (entry.item.avatar_option_id) {
    await avatar.grantOption(userId, entry.item.avatar_option_id);
  }

  return toInventoryItem(entry.item, true, true);
}

/** Consumibles. Los que actúan dentro de una misión reciben `attemptId`. */
export async function useItem(userId: string, itemId: string, _attemptId?: string) {
  const entry = await economy.inventoryEntry(userId, itemId);
  if (!entry || entry.quantity < 1) throw err.itemNotOwned();
  if (!entry.item.is_consumable) {
    throw err.conflict('ITEM_NOT_USABLE_HERE', 'Ese objeto se equipa, no se consume.');
  }

  const effect = entry.item.effect ?? {};
  await economy.setQuantity(userId, itemId, entry.quantity - 1);

  switch (effect.type) {
    case 'streak_freeze': {
      const streak = await meta.streak(userId);
      await meta.upsertStreak(userId, { freezes_available: (streak?.freezes_available ?? 0) + 1 });
      break;
    }
    case 'gems': {
      const profile = await profiles.byId(userId);
      if (profile) await profiles.update(userId, { gems: profile.gems + (effect.amount ?? 0) });
      break;
    }
    // free_hint y skip_activity los consumen los endpoints de la misión.
    default:
      break;
  }

  return { effect: effect.type ?? 'none', itemId };
}
