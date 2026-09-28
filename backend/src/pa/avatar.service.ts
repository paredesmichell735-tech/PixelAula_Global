import type { AvatarCatalog, AvatarConfig, AvatarOption, Rarity, SavedAvatarStyle } from '@pixelaula/api';
import { AVATAR_CATEGORIES } from '@pixelaula/api';
import { err } from '../lib/errors.js';
import { isOptionOwned, toAvatarOption, toAvatarStyle } from './mappers.js';
import { avatar } from './repo.js';
import type { AvatarOptionRow } from './rows.js';

const LABELS: Record<string, string> = {
  skinTone: 'Tono de piel',
  hair: 'Cabello',
  hairColor: 'Color de cabello',
  eyes: 'Ojos',
  eyebrows: 'Cejas',
  expression: 'Expresión',
  top: 'Ropa superior',
  bottom: 'Ropa inferior',
  shoes: 'Calzado',
  glasses: 'Gafas',
  headphones: 'Audífonos',
  headwear: 'Sombreros',
  backpack: 'Mochilas',
  accessory: 'Accesorios',
  pet: 'Mascotas',
  effect: 'Efectos',
  background: 'Fondos',
};

const RARITY_WEIGHT: Record<Rarity, number> = {
  COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4,
};

export async function getCatalog(userId: string): Promise<AvatarCatalog> {
  const [rows, owned] = await Promise.all([avatar.options(), avatar.ownedOptionIds(userId)]);

  const byCategory = new Map<string, AvatarOption[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    list.push(toAvatarOption(row, owned.has(row.id)));
    byCategory.set(row.category, list);
  }

  return {
    categories: AVATAR_CATEGORIES.map(category => ({
      category,
      label: LABELS[category] ?? category,
      options: byCategory.get(category) ?? [],
    })),
  };
}

export async function getConfig(userId: string): Promise<AvatarConfig> {
  const config = await avatar.config(userId);
  if (config) return config;
  // Usuario sin avatar (alta previa al trigger): se arma con los valores por defecto.
  return defaultsFrom(await avatar.options());
}

function defaultsFrom(rows: AvatarOptionRow[]): AvatarConfig {
  const config = {} as Record<string, string>;
  for (const category of AVATAR_CATEGORIES) {
    const options = rows.filter(r => r.category === category).sort((a, b) => a.order_index - b.order_index);
    config[category] = (options.find(o => o.is_default) ?? options[0])?.slug ?? '';
  }
  return config as unknown as AvatarConfig;
}

/**
 * Guarda el avatar comprobando que cada pieza exista y sea del usuario.
 * Sin esto, cualquiera podría equiparse la corona legendaria editando el body.
 */
export async function saveConfig(userId: string, config: AvatarConfig): Promise<AvatarConfig> {
  const [rows, owned] = await Promise.all([avatar.options(), avatar.ownedOptionIds(userId)]);

  for (const category of AVATAR_CATEGORIES) {
    const slug = config[category];
    if (!slug) continue;

    const option = rows.find(r => r.category === category && r.slug === slug);
    if (!option) {
      throw err.validation({ [category]: `La pieza "${slug}" no existe.` });
    }
    if (!isOptionOwned(option, owned.has(option.id))) {
      throw err.conflict('ITEM_NOT_OWNED', `Todavía no tienes "${option.name}".`);
    }
  }

  return avatar.saveConfig(userId, config);
}

function rarityOf(config: AvatarConfig, rows: AvatarOptionRow[]): Rarity {
  let best: Rarity = 'COMMON';
  for (const category of AVATAR_CATEGORIES) {
    const option = rows.find(r => r.category === category && r.slug === config[category]);
    if (option && RARITY_WEIGHT[option.rarity] > RARITY_WEIGHT[best]) best = option.rarity;
  }
  return best;
}

export async function listStyles(userId: string): Promise<SavedAvatarStyle[]> {
  const [rows, options] = await Promise.all([avatar.styles(userId), avatar.options()]);
  return rows.map(row => toAvatarStyle(row, rarityOf(row.config, options)));
}

export async function createStyle(userId: string, name: string, config?: AvatarConfig): Promise<SavedAvatarStyle> {
  const finalConfig = config ?? (await getConfig(userId));
  if (config) await saveConfig(userId, config);

  const row = await avatar.createStyle(userId, name, finalConfig);
  const options = await avatar.options();
  return toAvatarStyle(row, rarityOf(finalConfig, options));
}

export async function renameStyle(userId: string, id: string, name: string): Promise<SavedAvatarStyle> {
  const existing = await avatar.style(userId, id);
  if (!existing) throw err.notFound('Estilo');

  const row = await avatar.updateStyle(userId, id, { name });
  const options = await avatar.options();
  return toAvatarStyle(row, rarityOf(row.config, options));
}

export async function deleteStyle(userId: string, id: string) {
  const existing = await avatar.style(userId, id);
  if (!existing) throw err.notFound('Estilo');
  await avatar.deleteStyle(userId, id);
  return { deleted: id };
}

export async function equipStyle(userId: string, id: string): Promise<AvatarConfig> {
  const style = await avatar.style(userId, id);
  if (!style) throw err.notFound('Estilo');

  await avatar.unequipAll(userId);
  await avatar.updateStyle(userId, id, { is_equipped: true });
  return saveConfig(userId, style.config);
}

/** Look aleatorio, pero solo con piezas que el usuario tenga. */
export async function randomConfig(userId: string): Promise<AvatarConfig> {
  const [rows, owned] = await Promise.all([avatar.options(), avatar.ownedOptionIds(userId)]);
  const config = {} as Record<string, string>;

  for (const category of AVATAR_CATEGORIES) {
    const available = rows.filter(r => r.category === category && isOptionOwned(r, owned.has(r.id)));
    if (!available.length) continue;
    config[category] = available[Math.floor(Math.random() * available.length)]!.slug;
  }

  return avatar.saveConfig(userId, config as unknown as AvatarConfig);
}
