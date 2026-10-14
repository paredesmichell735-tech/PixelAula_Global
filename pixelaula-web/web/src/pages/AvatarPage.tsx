import type { AvatarCategory, AvatarConfig, AvatarOption, Rarity } from '@pixelaula/api';
import { useQueryClient } from '@tanstack/react-query';
import { Backpack, Check, ChevronRight, Gem, LockKeyhole, RotateCcw, RotateCw, Save, Shirt, Shuffle, Sparkles, Star, Trash2, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Async } from '../components/AsyncState';
import { AvatarCharacter } from '../components/AvatarCharacter';
import { CharacterPortrait, EXPRESSIONS, type Expression } from '../components/CharacterPortrait';
import { keys, useAvatarCatalog, useAvatarStyles, useMe } from '../hooks/queries';
import { api } from '../lib/api';
import '../styles/avatar-studio.css';

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

type AvatarView = {
  label: string;
  spriteView: string;
  src: string;
  mirrored?: boolean;
};

const AVATAR_VIEWS: AvatarView[] = [
  {
    label: 'Frente',
    spriteView: 'avatar-adventurer-front',
    src: '/assets/character/avatar-adventurer-front-hair_type_1.png',
  },
  {
    label: 'Perfil izquierdo',
    spriteView: 'avatar-adventurer-profile-left',
    src: '/assets/character/avatar-adventurer-profile-left-hair_type_1.png',
  },
  {
    label: 'Espalda',
    spriteView: 'avatar-adventurer-back',
    src: '/assets/character/avatar-adventurer-back-hair_type_1.png',
  },
  {
    label: 'Perfil derecho',
    spriteView: 'avatar-adventurer-profile-left',
    src: '/assets/character/avatar-adventurer-profile-left-hair_type_1.png',
    mirrored: true,
  },
] as const;

export function AvatarPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const catalog = useAvatarCatalog();
  const styles = useAvatarStyles();

  const [draft, setDraft] = useState<AvatarConfig | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
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

  function rotate(step: number) {
    setViewIndex(current => (current + step + AVATAR_VIEWS.length) % AVATAR_VIEWS.length);
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
  const avatarView = AVATAR_VIEWS[viewIndex]!;
  const selectedSkinTone = catalog.data?.categories
    .find(group => group.category === 'skinTone')?.options
    .find(option => option.id === draft?.skinTone)?.asset ?? '#FFD1AD';
  const selectedHairColor = catalog.data?.categories
    .find(group => group.category === 'hairColor')?.options
    .find(option => option.id === draft?.hairColor)?.asset ?? '#7B2B1F';
  const selectedHairType = catalog.data?.categories
    .find(group => group.category === 'hair')?.options
    .find(option => option.id === draft?.hair)?.asset;
  const hairSpriteSrc = /^hair_type_[1-4]$/.test(selectedHairType ?? '')
    ? `/assets/character/${avatarView.spriteView}-${selectedHairType}.png`
    : avatarView.src;

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
    <div className="avatar-page avatar-page--studio">
      <aside className="avatar-intro avatar-rail">
        <div className="avatar-rail__intro">
          <span className="eyebrow">Crea tu personaje</span>
          <h2>Personaliza tu avatar y demuestra tu estilo</h2>
          <p>Combina piezas y desbloquea opciones únicas mientras avanzas.</p>
        </div>

        <nav className="avatar-tabs" aria-label="Secciones del avatar">
          <a className="active" href="#personalizacion"><Sparkles size={17}/><span>Personalización</span><ChevronRight size={15}/></a>
          <a href="#inventario"><Backpack size={17}/><span>Inventario</span><ChevronRight size={15}/></a>
          <a href="#mis-estilos"><Star size={17}/><span>Mis estilos</span><ChevronRight size={15}/></a>
          <button type="button" disabled title="Disponible próximamente"><Trophy size={17}/><span>Logros de avatar</span><small>Pronto</small></button>
          <button type="button" disabled title="Disponible próximamente"><Gem size={17}/><span>Objetos especiales</span><small>Pronto</small></button>
        </nav>

        <div className="avatar-reward"><Gem size={17}/><span><b>¡Desbloquea más objetos!</b>Completa misiones y consigue nuevas piezas para tu personaje.</span></div>
      </aside>

      <section className="avatar-editor" id="personalizacion">
        <div className="avatar-preview">
          <span className="avatar-preview__eyebrow">Tu personaje</span>
          <AvatarCharacter
            key={viewIndex}
            src={hairSpriteSrc}
            skinTone={selectedSkinTone}
            hairColor={selectedHairColor}
            alt={`Personaje de PixelAula: vista ${avatarView.label.toLowerCase()}`}
            className="avatar-preview__character"
            mirrored={avatarView.mirrored}
          />
          <CharacterPortrait expression={previewExpression} size={82} className="avatar-preview__portrait" />
          <div className="avatar-preview__base" />
          <h3>Vista del avatar</h3>
          <span className={`level-pill tone-${RARITY_TONE[styleRarity]}`}>Estilo {RARITY_LABEL[styleRarity]}</span>
          <div className="avatar-turn-controls" aria-label="Rotar personaje">
            <button type="button" onClick={() => rotate(-1)} aria-label="Girar a la izquierda" title="Girar a la izquierda">
              <RotateCcw size={16} />
            </button>
            <span>{avatarView.label}</span>
            <button type="button" onClick={() => rotate(1)} aria-label="Girar a la derecha" title="Girar a la derecha">
              <RotateCw size={16} />
            </button>
          </div>
        </div>

        <div className="avatar-workspace">
          <div className="avatar-workspace__heading">
            <div><span className="eyebrow">Personalización</span><h2>Arma tu estilo</h2></div>
            <p>Elige las piezas de tu aventurero.</p>
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
          </div>
          {error && <div className="auth-error avatar-feedback">{error}</div>}
        </div>
      </section>

      <section className="avatar-bottom" aria-label="Estilos, inventario y acciones">
        <div className="avatar-library avatar-bottom__panel" id="mis-estilos">
          <div className="avatar-bottom__heading"><div><Star size={17}/><h2>Mis estilos guardados</h2></div><span>Guarda tus combinaciones</span></div>
          <Async query={styles}>
            {data => (
              <div className="saved-styles">
                {data.length === 0 && <p className="empty-note avatar-empty-style">Aún no tienes estilos guardados. Ponle nombre a tu look para conservarlo.</p>}
                {data.map(style => (
                  <div key={style.id} className={`style-card ${style.isEquipped ? 'equipped' : ''}`}>
                    <button className="style-card__main" onClick={() => equipStyle(style.id)} disabled={busy}>
                      <b>{style.name}</b>
                      <span className={`tone-${RARITY_TONE[style.rarity]}`}>{RARITY_LABEL[style.rarity]}</span>
                    </button>
                    {style.isEquipped && <Check size={14} />}
                    <button className="link-button" onClick={() => removeStyle(style.id)} aria-label="Borrar estilo"><Trash2 size={14} /></button>
                  </div>
                ))}
                <div className="join-class avatar-style-create">
                  <div className="input-shell"><input value={styleName} onChange={e => setStyleName(e.target.value)} placeholder="Nombre del estilo" maxLength={30} /></div>
                  <button className="pixel-button pixel-button--cyan pixel-button--sm" onClick={saveStyle} disabled={busy || !styleName.trim()}>Guardar</button>
                </div>
              </div>
            )}
          </Async>
        </div>

        <div className="avatar-inventory avatar-bottom__panel" id="inventario">
          <div className="avatar-bottom__heading"><div><Backpack size={17}/><h2>Inventario de objetos</h2></div><span className="avatar-coming-soon">En construcción</span></div>
          <p>Pronto podrás explorar y organizar aquí las piezas que desbloquees.</p>
          <div className="avatar-inventory__categories"><span><Shirt size={17}/>Ropa</span><span><Sparkles size={17}/>Accesorios</span><span><Gem size={17}/>Especiales</span></div>
        </div>

        <div className="avatar-actions-panel">
          <button className="pixel-button pixel-button--cyan" onClick={save} disabled={busy || !dirty}><Save size={17}/>{busy ? 'Guardando...' : dirty ? 'Guardar estilo' : 'Estilo guardado'}</button>
          <button className="pixel-button pixel-button--ghost" onClick={randomize} disabled={busy}><Shuffle size={17}/>Estilo aleatorio</button>
          {notice && <div className="save-toast">✓ {notice}</div>}
        </div>
      </section>
    </div>
  );
}
