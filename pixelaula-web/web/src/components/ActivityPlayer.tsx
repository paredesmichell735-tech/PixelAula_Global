import type { Activity, ActivityAnswer } from '@pixelaula/api';
import { BatteryCharging, Cable, Check, Lightbulb, Monitor, Router, Server, ToggleRight, Globe } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Reproductor de actividades.
 *
 * Cada tipo tiene su forma de responder, pero todos entregan un `ActivityAnswer`
 * con la misma estructura que valida el servidor. Aquí no se sabe si la
 * respuesta es correcta: eso lo decide el backend.
 */

interface Props {
  activity: Activity;
  disabled: boolean;
  onChange: (answer: ActivityAnswer | null) => void;
}

export function ActivityPlayer({ activity, disabled, onChange }: Props) {
  switch (activity.type) {
    case 'MULTIPLE_CHOICE':
    case 'IMAGE_SELECTION':
      return <ChoiceActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'TRUE_FALSE':
      return <TrueFalseActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'ORDERING':
      return <OrderingActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'MATCHING':
      return <MatchingActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'DRAG_DROP':
      return <ChoiceActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'SQL_CHALLENGE':
      return <SqlActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'NETWORK_SIMULATION':
      return <NetworkActivity activity={activity} disabled={disabled} onChange={onChange} />;
    case 'CIRCUIT_SIMULATION':
      return <CircuitActivity activity={activity} disabled={disabled} onChange={onChange} />;
  }
}

// ---------------------------------------------------------------- opción única

function ChoiceActivity({ activity, disabled, onChange }: Props) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
    onChange(null);
  }, [activity.id]);

  function choose(id: string) {
    setPicked(id);
    onChange({ type: activity.type === 'IMAGE_SELECTION' ? 'IMAGE_SELECTION' : 'MULTIPLE_CHOICE', optionId: id });
  }

  return (
    <div className="activity-options">
      {(activity.options ?? []).map(option => (
        <button
          key={option.id}
          className={`activity-option ${picked === option.id ? 'picked' : ''}`}
          disabled={disabled}
          onClick={() => choose(option.id)}
        >
          <span className="activity-option__key">{option.id.toUpperCase()}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ verdadero/falso

function TrueFalseActivity({ activity, disabled, onChange }: Props) {
  const [value, setValue] = useState<boolean | null>(null);

  useEffect(() => {
    setValue(null);
    onChange(null);
  }, [activity.id]);

  function choose(next: boolean) {
    setValue(next);
    onChange({ type: 'TRUE_FALSE', value: next });
  }

  return (
    <div className="activity-options activity-options--pair">
      <button className={`activity-option ${value === true ? 'picked' : ''}`} disabled={disabled} onClick={() => choose(true)}>
        <span className="activity-option__key">V</span> Verdadero
      </button>
      <button className={`activity-option ${value === false ? 'picked' : ''}`} disabled={disabled} onClick={() => choose(false)}>
        <span className="activity-option__key">F</span> Falso
      </button>
    </div>
  );
}

// -------------------------------------------------------------------- ordenar

function OrderingActivity({ activity, disabled, onChange }: Props) {
  const initial = useMemo(() => activity.orderingItems ?? [], [activity.id]);
  const [order, setOrder] = useState<string[]>(initial);

  useEffect(() => {
    setOrder(initial);
    onChange({ type: 'ORDERING', order: initial });
  }, [activity.id]);

  function move(index: number, delta: number) {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    onChange({ type: 'ORDERING', order: next });
  }

  return (
    <ol className="activity-ordering">
      {order.map((item, i) => (
        <li key={item}>
          <span className="activity-ordering__num">{i + 1}</span>
          <span className="activity-ordering__text">{item}</span>
          <span className="activity-ordering__moves">
            <button disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label="Subir">▲</button>
            <button disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">▼</button>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ emparejar

function MatchingActivity({ activity, disabled, onChange }: Props) {
  const pairs = useMemo(() => activity.matchingPairs ?? [], [activity.id]);
  // Las definiciones se barajan: si salieran en orden, emparejar sería trivial.
  const definitions = useMemo(
    () => [...pairs.map(p => p.definition)].sort((a, b) => a.localeCompare(b)),
    [activity.id],
  );
  const [picks, setPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    setPicks({});
    onChange(null);
  }, [activity.id]);

  function assign(concept: string, definition: string) {
    const next = { ...picks, [concept]: definition };
    setPicks(next);
    const complete = pairs.every(p => next[p.concept]);
    onChange(
      complete
        ? { type: 'MATCHING', pairs: pairs.map(p => ({ concept: p.concept, definition: next[p.concept]! })) }
        : null,
    );
  }

  return (
    <div className="activity-matching">
      {pairs.map(pair => (
        <div key={pair.concept} className="activity-matching__row">
          <b>{pair.concept}</b>
          <select
            value={picks[pair.concept] ?? ''}
            disabled={disabled}
            onChange={e => assign(pair.concept, e.target.value)}
          >
            <option value="" disabled>Elige...</option>
            {definitions.map(definition => (
              <option key={definition} value={definition}>{definition}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------ SQL

function SqlActivity({ activity, disabled, onChange }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const data = activity.sqlData;

  useEffect(() => {
    setValue(null);
    onChange(null);
  }, [activity.id]);

  function choose(option: string) {
    setValue(option);
    onChange({ type: 'SQL_CHALLENGE', value: option });
  }

  const [before, after] = (data?.queryTemplate ?? '').split(data?.blankSlot ?? '___');

  return (
    <div className="activity-sql">
      <pre className="activity-sql__query">
        <code>
          {before}
          <mark>{value ?? data?.blankSlot ?? '___'}</mark>
          {after}
        </code>
      </pre>
      <div className="activity-options">
        {(data?.options ?? []).map(option => (
          <button
            key={option}
            className={`activity-option activity-option--code ${value === option ? 'picked' : ''}`}
            disabled={disabled}
            onClick={() => choose(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ simuladores

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  PC: Monitor,
  SWITCH: Cable,
  ROUTER: Router,
  SERVER: Server,
  INTERNET: Globe,
};

/** Se eligen dos dispositivos y se tiende el cable entre ellos. */
function NetworkActivity({ activity, disabled, onChange }: Props) {
  const devices = activity.networkData?.devices ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ from: string; to: string }>>([]);

  useEffect(() => {
    setSelected(null);
    setLinks([]);
    onChange({ type: 'NETWORK_SIMULATION', connections: [] });
  }, [activity.id]);

  function update(next: Array<{ from: string; to: string }>) {
    setLinks(next);
    onChange({ type: 'NETWORK_SIMULATION', connections: next });
  }

  function tap(id: string) {
    if (disabled) return;
    if (!selected) return setSelected(id);
    if (selected === id) return setSelected(null);

    const exists = links.some(
      l => (l.from === selected && l.to === id) || (l.from === id && l.to === selected),
    );
    // Volver a unir dos que ya estaban conectados quita el cable.
    update(exists
      ? links.filter(l => !((l.from === selected && l.to === id) || (l.from === id && l.to === selected)))
      : [...links, { from: selected, to: id }]);
    setSelected(null);
  }

  return (
    <div className="activity-sim">
      <div className="activity-sim__board">
        {devices.map(device => {
          const Icon = DEVICE_ICONS[device.type] ?? Monitor;
          const connected = links.some(l => l.from === device.id || l.to === device.id);
          return (
            <button
              key={device.id}
              className={`sim-node ${selected === device.id ? 'selected' : ''} ${connected ? 'wired' : ''}`}
              disabled={disabled}
              onClick={() => tap(device.id)}
            >
              <Icon size={26} />
              <b>{device.label}</b>
              {device.ip && <small>{device.ip}</small>}
            </button>
          );
        })}
      </div>
      <div className="activity-sim__links">
        {links.length === 0
          ? <span className="empty-note">Toca dos dispositivos para conectarlos.</span>
          : links.map((l, i) => (
              <span key={i} className="sim-link">
                {devices.find(d => d.id === l.from)?.label} ↔ {devices.find(d => d.id === l.to)?.label}
              </span>
            ))}
      </div>
    </div>
  );
}

const COMPONENT_ICONS: Record<string, typeof Lightbulb> = {
  BATTERY: BatteryCharging,
  WIRE: Cable,
  CORNER_WIRE: Cable,
  SWITCH: ToggleRight,
  BULB: Lightbulb,
};

/** Igual que la red, más el estado abierto/cerrado de los interruptores. */
function CircuitActivity({ activity, disabled, onChange }: Props) {
  const components = activity.circuitData?.components ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ from: string; to: string }>>([]);
  const [states, setStates] = useState<Record<string, 'OPEN' | 'CLOSED'>>({});

  useEffect(() => {
    setSelected(null);
    setLinks([]);
    const initial: Record<string, 'OPEN' | 'CLOSED'> = {};
    for (const c of components) if (c.type === 'SWITCH') initial[c.id] = 'OPEN';
    setStates(initial);
    onChange({ type: 'CIRCUIT_SIMULATION', components: [], connections: [] });
  }, [activity.id]);

  function emit(nextLinks: typeof links, nextStates: typeof states) {
    onChange({
      type: 'CIRCUIT_SIMULATION',
      components: Object.entries(nextStates).map(([id, state]) => ({ id, state })),
      connections: nextLinks,
    });
  }

  function tap(id: string, type: string) {
    if (disabled) return;

    if (type === 'SWITCH' && selected === null) {
      const next = { ...states, [id]: states[id] === 'CLOSED' ? 'OPEN' : 'CLOSED' } as typeof states;
      setStates(next);
      emit(links, next);
      return;
    }

    if (!selected) return setSelected(id);
    if (selected === id) return setSelected(null);

    const exists = links.some(l => (l.from === selected && l.to === id) || (l.from === id && l.to === selected));
    const next = exists
      ? links.filter(l => !((l.from === selected && l.to === id) || (l.from === id && l.to === selected)))
      : [...links, { from: selected, to: id }];
    setLinks(next);
    emit(next, states);
    setSelected(null);
  }

  return (
    <div className="activity-sim">
      <div className="activity-sim__board activity-sim__board--circuit">
        {components.map(component => {
          const Icon = COMPONENT_ICONS[component.type] ?? Cable;
          const isClosed = states[component.id] === 'CLOSED';
          const wired = links.some(l => l.from === component.id || l.to === component.id);
          return (
            <button
              key={component.id}
              className={`sim-node ${selected === component.id ? 'selected' : ''} ${wired ? 'wired' : ''} ${isClosed ? 'closed' : ''}`}
              disabled={disabled}
              onClick={() => tap(component.id, component.type)}
            >
              <Icon size={26} />
              <b>{component.label}</b>
              {component.type === 'SWITCH' && <small>{isClosed ? 'Cerrado' : 'Abierto'}</small>}
            </button>
          );
        })}
      </div>
      <div className="activity-sim__links">
        {links.length === 0
          ? <span className="empty-note">Toca dos componentes para unirlos. Pulsa el interruptor para abrirlo o cerrarlo.</span>
          : links.map((l, i) => (
              <span key={i} className="sim-link">
                {components.find(c => c.id === l.from)?.label} ↔ {components.find(c => c.id === l.to)?.label}
              </span>
            ))}
      </div>
      {links.length > 0 && (
        <button className="pixel-button pixel-button--ghost pixel-button--sm" disabled={disabled} onClick={() => { setLinks([]); emit([], states); }}>
          <Check size={14} /> Quitar todos los cables
        </button>
      )}
    </div>
  );
}
