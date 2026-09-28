import type { LevelNodeData, Subject } from '@pixelaula/api';
import { Braces, ChevronRight, Database, LockKeyhole, Network, Pi, Star, Trophy, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Async } from '../components/AsyncState';
import { CharacterPortrait } from '../components/CharacterPortrait';
import { NeonCard } from '../components/NeonCard';
import { ProgressBar } from '../components/ProgressBar';
import { useLearningMap, useMe } from '../hooks/queries';
import { toneOf } from '../lib/adapters';
import { useAvatar } from '../state/avatar';

const ICONS: Record<string, typeof Zap> = {
  database: Database,
  network: Network,
  bolt: Zap,
  code: Braces,
  math: Pi,
  brain: Braces,
};

function SubjectIconOf({ subject }: { subject: Subject }) {
  const Icon = ICONS[subject.icon] ?? Zap;
  return <Icon />;
}

/** Un nodo del mapa. El estado decide si se puede pulsar y cómo se ve. */
function MapNode({ node, onOpen }: { node: LevelNodeData; onOpen: (id: string) => void }) {
  const locked = node.status === 'LOCKED';
  const done = node.status === 'COMPLETED' || node.status === 'PERFECT';

  return (
    <button
      className={`map-node ${done ? 'done' : ''} ${node.status === 'CURRENT' ? 'current' : ''} ${locked ? 'locked' : ''}`}
      disabled={locked}
      onClick={() => onOpen(node.missionId)}
      title={locked ? 'Completa la misión anterior' : node.title}
    >
      {locked ? <LockKeyhole size={15} /> : node.levelNumber}
      <i>{'★'.repeat(node.stars)}{'☆'.repeat(3 - node.stars)}</i>
    </button>
  );
}

export function LearningMapPage() {
  const navigate = useNavigate();
  const { expression } = useAvatar();
  const map = useLearningMap();
  const me = useMe();

  const openMission = (missionId: string) => navigate(`/app/misiones/${missionId}`);

  return (
    <div className="learning-layout">
      <aside className="learning-profile">
        <div className="profile-portrait"><CharacterPortrait expression={expression} size={96} /></div>
        <span>Hola,</span>
        <h2>{me.data?.displayName ?? '...'}</h2>
        <div className="level-box">Nivel {me.data?.level ?? 1}</div>
        <ProgressBar value={me.data?.currentXp ?? 0} max={me.data?.requiredXp ?? 500} />

        <div className="stat-grid stat-grid--3">
          <div><Star /><b>{me.data?.level ?? 1}</b><span>Nivel</span></div>
          <div><Trophy /><b>{me.data?.pixelsCoins ?? 0}</b><span>Pixeles</span></div>
          <div><span className="diamond">◆</span><b>{me.data?.gems ?? 0}</b><span>Gemas</span></div>
        </div>

        <h3>Progreso global</h3>
        <Async query={map}>
          {data => (
            <>
              <div className="global-progress">
                <strong>{data.globalProgressPercent}%</strong>
                {data.subjects.slice(0, 4).map(({ subject }, i) => (
                  <span key={subject.id}>
                    <i className={`dot ${toneOf(subject, i)}`} />
                    {subject.name} {subject.progressPercent}%
                  </span>
                ))}
              </div>

              {data.nextMission && (
                <NeonCard tone="yellow" className="next-mission" title="Próxima misión">
                  <button className="next-mission__link" onClick={() => openMission(data.nextMission!.id)}>
                    <b>{data.nextMission.title}</b>
                    <span>{data.nextMission.subjectName} · Nivel {data.nextMission.levelNumber}</span>
                    <ChevronRight />
                  </button>
                </NeonCard>
              )}
            </>
          )}
        </Async>
      </aside>

      <section className="learning-main">
        <div className="map-title">
          <h1>Mapa de <span>Aprendizaje</span></h1>
          <p>Explora, aprende y avanza en tu aventura.</p>
        </div>

        <Async query={map}>
          {data => (
            <>
              <div
                className="world-map"
                style={{ backgroundImage: 'linear-gradient(rgba(5,10,33,.08),rgba(5,10,33,.20)),url(/assets/bg-path.jpg)' }}
              >
                {data.subjects.slice(0, 3).map(({ subject, nodes }, idx) => (
                  <div key={subject.id} className={`world-zone world-zone--${idx + 1} tone-border-${toneOf(subject, idx)}`}>
                    <div className={`world-zone__icon tone-bg-${toneOf(subject, idx)}`}>
                      <SubjectIconOf subject={subject} />
                    </div>
                    <b>{subject.name}</b>
                    <div className="world-nodes">
                      {nodes.map(node => <MapNode key={node.id} node={node} onOpen={openMission} />)}
                      {nodes.length === 0 && <span className="empty-note">Sin misiones todavía</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="learning-cards">
                {data.subjects.map(({ subject, nodes, rewards }, idx) => {
                  const tone = toneOf(subject, idx);
                  const next = nodes.find(n => n.status === 'CURRENT' || n.status === 'AVAILABLE');

                  return (
                    <NeonCard key={subject.id} tone={tone}>
                      <div className="learning-card-head">
                        <div className={`tone-bg-${tone}`}><SubjectIconOf subject={subject} /></div>
                        <div>
                          <h3>{subject.name}</h3>
                          <p>{subject.description}</p>
                        </div>
                        <span>Niveles<br /><b>{subject.completedMissions}/{subject.totalMissions}</b></span>
                      </div>

                      <div className="mini-level-track">
                        {nodes.slice(0, 6).map(node => (
                          <span key={node.id} className={node.status === 'LOCKED' ? '' : 'active'}>
                            {node.status === 'LOCKED' ? <LockKeyhole size={14} /> : node.levelNumber}
                          </span>
                        ))}
                      </div>

                      <div className="reward-row">
                        <span>Recompensas</span>
                        {rewards.map(reward => <i key={reward.label} title={reward.label}>◆</i>)}
                      </div>

                      {next ? (
                        <button
                          className={`pixel-button pixel-button--${tone} pixel-button--full`}
                          onClick={() => openMission(next.missionId)}
                        >
                          {subject.completedMissions > 0 ? 'Continuar' : 'Comenzar'} <ChevronRight size={18} />
                        </button>
                      ) : (
                        <Link className={`pixel-button pixel-button--ghost pixel-button--full`} to="/app/materias">
                          {subject.status === 'COMPLETED' ? '¡Materia completada!' : 'Ver materia'}
                        </Link>
                      )}
                    </NeonCard>
                  );
                })}
              </div>
            </>
          )}
        </Async>
      </section>
    </div>
  );
}
