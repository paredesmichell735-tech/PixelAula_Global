import type { AvatarCategory, AvatarConfig, AvatarOption, Rarity } from '@pixelaula/api';
import { useQueryClient } from '@tanstack/react-query';
import { Check, LockKeyhole, Save, Shuffle, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Async } from '../components/AsyncState';
import { CharacterPortrait, EXPRESSIONS, type Expression } from '../components/CharacterPortrait';
import { keys, useAvatarCatalog, useAvatarStyles, useMe } from '../hooks/queries';
import { api } from '../lib/api';

const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: 'Común',
  UNCOMMON: 'Poco común',
  RARE: 'Raro',
  EPIC: 'Épico',
  LEGENDARY: 'Legendario',
};

const RARITY_TONE: Record<Rarity, string> = {
  COMMON: 'cyan',
  UNCOMMON: 'green',
  RARE: 'violet',
  EPIC: 'magenta',
  LEGENDARY: 'yellow',
};

const RARITY_ORDER: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

export function AvatarPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const catalog = useAvatarCatalog();
  const styles = useAvatarStyles();

  const [draft, setDraft] = useState<AvatarConfig | null>(null);
  const [styleName, setStyleName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El borrador arranca con lo que el usuario tiene puesto.
  useEffect(() => {
    if (me.data?.avatar && !draft) setDraft(me.data.avatar);
  }, [me.data?.avatar]);

  const dirty = Boolean(draft && me.data?.avatar && JSON.stringify(draft) !== JSON.stringify(me.data.avatar));

  function pick(category: AvatarCategory, option: AvatarOption) {
    if (!option.owned) {
      setError(`"${option.name}" todavía no es tuyo. Consíguelo en la tienda o jugando.`);
      return;
    }
    setError(null);
    setDraft(current => (current ? { ...current, [category]: option.id } : current));
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveAvatar(draft);
      await queryClient.invalidateQueries({ queryKey: keys.me });
      setNotice('Avatar guardado. Ya se ve en tu perfil y en la barra superior.');
      setTimeout(() => setNotice(null), 2600);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function randomize() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.randomAvatar();
      setDraft(next);
      await queryClient.invalidateQueries({ queryKey: keys.me });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveStyle() {
    if (!styleName.trim()) return;
    setBusy(true);
    try {
      await api.createAvatarStyle({ name: styleName.trim(), config: draft ?? undefined });
      setStyleName('');
      await queryClient.invalidateQueries({ queryKey: keys.avatarStyles });
      setNotice('Estilo guardado.');
      setTimeout(() => setNotice(null), 2000);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function equipStyle(id: string) {
    setBusy(true);
    try {
      const config = await api.equipAvatarStyle(id);
      setDraft(config);
      await queryClient.invalidateQueries({ queryKey: keys.me });
      await queryClient.invalidateQueries({ queryKey: keys.avatarStyles });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeStyle(id: string) {
    await api.deleteAvatarStyle(id);
    await queryClient.invalidateQueries({ queryKey: keys.avatarStyles });
  }

  // La expresión del borrador es la que se previsualiza, aunque no esté guardada.
  const previewExpression = EXPRESSIONS.includes(draft?.expression as Expression)
    ? (draft!.expression as Expression)
    : 'feliz';

  const styleRarity: Rarity = (() => {
    if (!draft || !catalog.data) return 'COMMON';
    let best: Rarity = 'COMMON';
    for (const group of catalog.data.categories) {
      const chosen = group.options.find(o => o.id === draft[group.category]);
      if (chosen && RARITY_ORDER.indexOf(chosen.rarity) > RARITY_ORDER.indexOf(best)) best = chosen.rarity;
    }
    return best;
  })();

  return (
    <div className="avatar-page">
      <aside className="avatar-intro">
        <span className="eyebrow">Crea tu personaje</span>
        <h2>Personaliza tu avatar y demuestra tu estilo</h2>
        <p>Combina piezas y desbloquea objetos especiales mientras avanzas.</p>

        <div className="avatar-reward">✨ Completa misiones y compra en la tienda para conseguir más piezas.</div>

        <h3>Mis estilos</h3>
        <Async query={styles}>
          {data => (
            <div className="saved-styles">
              {data.length === 0 && <p className="empty-note">Guarda tu look actual para volver a él cuando quieras.</p>}
              {data.map(style => (
                <div key={style.id} className={`style-card ${style.isEquipped ? 'equipped' : ''}`}>
                  <button className="style-card__main" onClick={() => equipStyle(style.id)} disabled={busy}>
                    <b>{style.name}</b>
                    <span className={`tone-${RARITY_TONE[style.rarity]}`}>{RARITY_LABEL[style.rarity]}</span>
                  </button>
                  {style.isEquipped && <Check size={14} />}
                  <button className="link-button" onClick={() => removeStyle(style.id)} aria-label="Borrar estilo">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="join-class">
                <div className="input-shell">
                  <input
                    value={styleName}
                    onChange={e => setStyleName(e.target.value)}
                    placeholder="Nombre del estilo"
                    maxLength={30}
                  />
                </div>
                <button
                  className="pixel-button pixel-button--cyan pixel-button--sm"
                  onClick={saveStyle}
                  disabled={busy || !styleName.trim()}
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </Async>
      </aside>

      <section className="avatar-editor">
        <div className="avatar-preview">
          <CharacterPortrait expression={previewExpression} size={180} className="avatar-preview__big" />
          <div className="avatar-preview__base" />
          <h3>Vista del avatar</h3>
          <span className={`level-pill tone-${RARITY_TONE[styleRarity]}`}>Estilo {RARITY_LABEL[styleRarity]}</span>
        </div>

        <div className="avatar-options">
          <Async query={catalog}>
            {data => (
              <>
                {data.categories.map(group => (
                  <div className="option-group" key={group.category}>
                    <h3>
                      <Sparkles size={16} />
                      {group.label}
                      <span className="option-group__note">
                        {group.options.filter(o => o.owned).length}/{group.options.length}
                      </span>
                    </h3>
                    <div className={`option-grid ${group.category === 'expression' ? 'option-grid--faces' : ''}`}>
                      {group.options.map(option => {
                        const selected = draft?.[group.category] === option.id;
                        return (
                          <button
                            key={option.id}
                            className={`${selected ? 'active' : ''} ${option.owned ? '' : 'locked'}`}
                            onClick={() => pick(group.category, option)}
                            title={`${option.name} · ${RARITY_LABEL[option.rarity]}${option.owned ? '' : ` · ${option.priceCoins} Pixeles`}`}
                          >
                            {group.category === 'expression' ? (
                              <CharacterPortrait expression={option.asset as Expression} size={46} />
                            ) : option.asset.startsWith('#') ? (
                              <span style={{ backgroundColor: option.asset }} />
                            ) : (
                              <span className={`tone-bg-${RARITY_TONE[option.rarity]}`}>
                                {option.owned ? option.name.charAt(0) : <LockKeyhole size={13} />}
                              </span>
                            )}
                            <small>{option.name}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </Async>

          {error && <div className="auth-error">{error}</div>}

          <div className="avatar-actions">
            <button className="pixel-button pixel-button--ghost" onClick={randomize} disabled={busy}>
              <Shuffle size={17} /> Aleatorio
            </button>
            <button className="pixel-button pixel-button--yellow" onClick={save} disabled={busy || !dirty}>
              <Save size={17} /> {busy ? 'Guardando...' : dirty ? 'Guardar avatar' : 'Sin cambios'}
            </button>
          </div>

          {notice && <div className="save-toast">✓ {notice}</div>}
        </div>
      </section>
    </div>
  );
}
