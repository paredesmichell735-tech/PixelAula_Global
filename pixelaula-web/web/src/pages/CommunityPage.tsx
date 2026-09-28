import type { LeaderboardPeriod, LeaderboardScope } from '@pixelaula/api';
import { useQueryClient } from '@tanstack/react-query';
import { Crown, Flame, Heart, Medal, MessageCircle, Send, Star, Trophy, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Async } from '../components/AsyncState';
import { CharacterPortrait, PeerPortrait } from '../components/CharacterPortrait';
import { NeonCard } from '../components/NeonCard';
import {
  keys, useClasses, useCommunityFeed, useFriends, useJoinClass, useLeaderboard, useLikePost,
} from '../hooks/queries';
import { timeAgo } from '../lib/adapters';
import { api } from '../lib/api';

const TABS: Array<{ scope: LeaderboardScope; period: LeaderboardPeriod; label: string }> = [
  { scope: 'global', period: 'week', label: 'General semanal' },
  { scope: 'global', period: 'all', label: 'Histórico' },
  { scope: 'friends', period: 'all', label: 'Amigos' },
  { scope: 'class', period: 'all', label: 'Mi clase' },
];

export function CommunityPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const active = TABS[tab]!;

  const leaderboard = useLeaderboard(active.scope, active.period);
  const friends = useFriends();
  const classes = useClasses();
  const feed = useCommunityFeed();
  const joinClass = useJoinClass();
  const likePost = useLikePost();

  const [username, setUsername] = useState('');
  const [friendError, setFriendError] = useState<string | null>(null);
  const [classCode, setClassCode] = useState('');
  const [message, setMessage] = useState('');

  async function addFriend(event: FormEvent) {
    event.preventDefault();
    setFriendError(null);
    try {
      await api.sendFriendRequest({ username: username.trim() });
      setUsername('');
      await queryClient.invalidateQueries({ queryKey: keys.friends });
    } catch (cause) {
      setFriendError((cause as Error).message);
    }
  }

  async function respond(id: string, accept: boolean) {
    if (accept) await api.acceptFriendRequest(id);
    else await api.rejectFriendRequest(id);
    await queryClient.invalidateQueries({ queryKey: keys.friends });
  }

  async function post(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    await api.createPost({ message: message.trim() });
    setMessage('');
    await queryClient.invalidateQueries({ queryKey: keys.feed });
  }

  const pending = (friends.data ?? []).filter(f => f.status === 'PENDING_IN');
  const accepted = (friends.data ?? []).filter(f => f.status === 'ACCEPTED');

  return (
    <div className="page-stack">
      <section
        className="page-banner community-banner"
        style={{ backgroundImage: 'linear-gradient(90deg,rgba(8,20,46,.93),rgba(8,20,46,.2)),url(/assets/bg-school.jpg)' }}
      >
        <div>
          <h1>Ranking y <span>comunidad</span></h1>
          <p>Juntos aprendemos más lejos. Compite, colabora y forma parte de una comunidad increíble.</p>
        </div>
      </section>

      <div className="community-tabs">
        {TABS.map((item, i) => (
          <button key={item.label} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="community-grid">
        <NeonCard tone="cyan" title={`Ranking · ${active.label}`}>
          <Async query={leaderboard}>
            {data => (
              <>
                {data.entries.length >= 3 && <Podium entries={data.entries.slice(0, 3)} />}
                <div className="ranking-list">
                  {data.entries.length === 0 && (
                    <p className="empty-note">
                      {active.scope === 'friends' ? 'Agrega amigos para comparar progreso.'
                        : active.scope === 'class' ? 'Únete a una clase para ver su ranking.'
                        : 'Nadie ha sumado XP en este periodo.'}
                    </p>
                  )}
                  {data.entries.map(entry => (
                    <div key={entry.userId} className={entry.isCurrentUser ? 'me' : ''}>
                      <b>{entry.rank}</b>
                      <span className="ranking-avatar">
                        {entry.isCurrentUser
                          ? <CharacterPortrait size={30} />
                          : <PeerPortrait name={entry.displayName} size={30} />}
                      </span>
                      <div>
                        <strong>{entry.displayName}</strong>
                        <small>Nivel {entry.level}</small>
                      </div>
                      <span><Star size={14} />{entry.xp}</span>
                      <span><Flame size={14} />{entry.streakDays}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="yellow" title="Ranking de clases">
          <Async query={classes}>
            {data => (
              <>
                <div className="class-ranking">
                  {data.length === 0 && <p className="empty-note">Todavía no hay clases.</p>}
                  {data.map(room => (
                    <div key={room.id} className={room.joined ? 'me' : ''}>
                      <b>{room.rank ?? '-'}</b>
                      <span>{room.name}{room.joined ? ' · tú' : ''}</span>
                      <strong>{room.totalXp.toLocaleString('es')} XP</strong>
                    </div>
                  ))}
                </div>

                <form
                  className="join-class"
                  onSubmit={e => {
                    e.preventDefault();
                    joinClass.mutate(classCode.trim().toUpperCase());
                    setClassCode('');
                  }}
                >
                  <div className="input-shell">
                    <input
                      value={classCode}
                      onChange={e => setClassCode(e.target.value)}
                      placeholder="Código de clase"
                      maxLength={12}
                    />
                  </div>
                  <button className="pixel-button pixel-button--yellow pixel-button--sm" disabled={joinClass.isPending}>
                    Unirme
                  </button>
                </form>
                {joinClass.error && <div className="auth-error">{(joinClass.error as Error).message}</div>}
                {joinClass.isSuccess && <div className="auth-notice">¡Listo! Ya estás en la clase.</div>}
              </>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="magenta" title="Mis amigos">
          <form className="join-class" onSubmit={addFriend}>
            <div className="input-shell">
              <UserPlus size={17} />
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username de tu amigo" />
            </div>
            <button className="pixel-button pixel-button--magenta pixel-button--sm">Agregar</button>
          </form>
          {friendError && <div className="auth-error">{friendError}</div>}

          <Async query={friends}>
            {() => (
              <>
                {pending.length > 0 && (
                  <div className="friend-requests">
                    <small>Solicitudes recibidas</small>
                    {pending.map(friend => (
                      <div key={friend.id}>
                        <PeerPortrait name={friend.displayName} size={28} />
                        <b>{friend.displayName}</b>
                        <button
                          className="pixel-button pixel-button--green pixel-button--sm"
                          onClick={() => respond(friend.id, true)}
                        >
                          Aceptar
                        </button>
                        <button className="link-button" onClick={() => respond(friend.id, false)}>Rechazar</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ranking-list">
                  {accepted.length === 0 && (
                    <p className="empty-note">Aún no tienes amigos. Agrega a alguien por su username.</p>
                  )}
                  {accepted.map(friend => (
                    <div key={friend.id}>
                      <span className="ranking-avatar"><PeerPortrait name={friend.displayName} size={30} /></span>
                      <div>
                        <strong>{friend.displayName}</strong>
                        <small>Nivel {friend.level}</small>
                      </div>
                      <span>{friend.xp} XP</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Async>
        </NeonCard>

        <NeonCard tone="cyan" title="Actividad de la comunidad">
          <form className="join-class" onSubmit={post}>
            <div className="input-shell">
              <MessageCircle size={17} />
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Comparte algo con la comunidad..."
                maxLength={280}
              />
            </div>
            <button className="pixel-button pixel-button--cyan pixel-button--sm" aria-label="Publicar">
              <Send size={15} />
            </button>
          </form>

          <Async query={feed}>
            {data => (
              <div className="community-feed">
                {data.items.length === 0 && <p className="empty-note">Sé el primero en escribir algo.</p>}
                {data.items.map(item => (
                  <div key={item.id}>
                    <span className="ranking-avatar"><PeerPortrait name={item.author.displayName} size={30} /></span>
                    <div>
                      <b>{item.author.displayName}</b>
                      <p>{item.message}</p>
                      <small>{timeAgo(item.createdAt)}</small>
                    </div>
                    <button
                      className={`link-button ${item.likedByMe ? 'tone-magenta' : ''}`}
                      onClick={() => likePost.mutate(item.id)}
                      aria-label="Me gusta"
                    >
                      <Heart size={16} />
                    </button>
                    <small>{item.likeCount}</small>
                  </div>
                ))}
              </div>
            )}
          </Async>
        </NeonCard>
      </div>
    </div>
  );
}

function Podium({
  entries,
}: {
  entries: Array<{ userId: string; displayName: string; xp: number; isCurrentUser?: boolean }>;
}) {
  // Orden visual del podio: segundo, primero, tercero.
  const layout = [1, 0, 2];
  return (
    <div className="podium">
      {layout.map((index, position) => {
        const entry = entries[index];
        if (!entry) return null;
        return (
          <div key={entry.userId} className={`podium__item podium__item--${position}`}>
            <span>
              {entry.isCurrentUser
                ? <CharacterPortrait size={42} />
                : <PeerPortrait name={entry.displayName} size={42} />}
            </span>
            {index === 0 ? <Crown /> : index === 1 ? <Medal /> : <Trophy />}
            <b>{entry.displayName}</b>
            <small>{entry.xp} XP</small>
          </div>
        );
      })}
    </div>
  );
}
