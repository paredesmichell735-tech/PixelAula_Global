import { describe, expect, it } from 'vitest';
import {
  activityScore, evaluate, isClosedLoop, missionScore, penaltyFor, shuffleWithSeed, starsFor,
} from '../src/pa/evaluator.js';

describe('opción múltiple', () => {
  const solution = { optionId: 'b' };

  it('acepta la opción correcta', () => {
    const v = evaluate('MULTIPLE_CHOICE', { type: 'MULTIPLE_CHOICE', optionId: 'b' }, solution);
    expect(v.correct).toBe(true);
    expect(v.score).toBe(100);
  });

  it('rechaza la equivocada', () => {
    expect(evaluate('MULTIPLE_CHOICE', { type: 'MULTIPLE_CHOICE', optionId: 'a' }, solution).correct).toBe(false);
  });

  it('rechaza una respuesta de otro tipo aunque el contenido parezca válido', () => {
    const v = evaluate('CIRCUIT_SIMULATION', { type: 'MULTIPLE_CHOICE', optionId: 'b' }, solution);
    expect(v.correct).toBe(false);
  });
});

describe('ordenar', () => {
  const solution = { order: ['uno', 'dos', 'tres'] };

  it('exige el orden completo', () => {
    expect(evaluate('ORDERING', { type: 'ORDERING', order: ['uno', 'dos', 'tres'] }, solution).correct).toBe(true);
  });

  it('da crédito parcial y lo dice', () => {
    const v = evaluate('ORDERING', { type: 'ORDERING', order: ['uno', 'tres', 'dos'] }, solution);
    expect(v.correct).toBe(false);
    expect(v.score).toBe(33);
    expect(v.feedback).toContain('1 de 3');
  });
});

describe('emparejar', () => {
  const solution = { pairs: [{ concept: 'LAN', definition: 'Red local' }, { concept: 'IP', definition: 'Dirección' }] };

  it('ignora mayúsculas y espacios de más', () => {
    const v = evaluate('MATCHING', {
      type: 'MATCHING',
      pairs: [{ concept: ' lan ', definition: 'RED LOCAL' }, { concept: 'IP', definition: 'Dirección' }],
    }, solution);
    expect(v.correct).toBe(true);
  });
});

describe('simulación de circuito', () => {
  const solution = {
    requiredConnections: [
      { from: 'battery', to: 'switch' },
      { from: 'switch', to: 'bulb' },
      { from: 'bulb', to: 'battery' },
    ],
    requiredStates: { switch: 'CLOSED' },
  };

  const wiring = [
    { from: 'battery', to: 'switch' },
    { from: 'switch', to: 'bulb' },
    { from: 'bulb', to: 'battery' },
  ];

  it('acepta el circuito cerrado con el interruptor cerrado', () => {
    const v = evaluate('CIRCUIT_SIMULATION', {
      type: 'CIRCUIT_SIMULATION',
      components: [{ id: 'switch', state: 'CLOSED' }],
      connections: wiring,
    }, solution);
    expect(v.correct).toBe(true);
    expect(v.score).toBe(100);
  });

  it('con el interruptor abierto no vale, aunque el cableado esté perfecto', () => {
    const v = evaluate('CIRCUIT_SIMULATION', {
      type: 'CIRCUIT_SIMULATION',
      components: [{ id: 'switch', state: 'OPEN' }],
      connections: wiring,
    }, solution);
    expect(v.correct).toBe(false);
    expect(v.feedback).toContain('interruptor');
  });

  it('las conexiones no tienen dirección', () => {
    const v = evaluate('CIRCUIT_SIMULATION', {
      type: 'CIRCUIT_SIMULATION',
      components: [{ id: 'switch', state: 'CLOSED' }],
      connections: wiring.map(c => ({ from: c.to, to: c.from })),
    }, solution);
    expect(v.correct).toBe(true);
  });
});

describe('detección de circuito cerrado', () => {
  const required = [{ from: 'a', to: 'b' }];

  it('un ciclo es cerrado', () => {
    expect(isClosedLoop([
      { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' },
    ], required)).toBe(true);
  });

  it('una cadena suelta no lo es', () => {
    expect(isClosedLoop([{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }], required)).toBe(false);
  });

  it('dos ciclos separados no cuentan como uno', () => {
    expect(isClosedLoop([
      { from: 'a', to: 'b' }, { from: 'b', to: 'a' },
      { from: 'x', to: 'y' }, { from: 'y', to: 'x' },
    ], required)).toBe(false);
  });
});

describe('simulación de red', () => {
  const solution = {
    requiredConnections: [{ from: 'pc1', to: 'switch' }, { from: 'switch', to: 'router' }],
  };

  it('avisa cuando sobran cables', () => {
    const v = evaluate('NETWORK_SIMULATION', {
      type: 'NETWORK_SIMULATION',
      connections: [
        { from: 'pc1', to: 'switch' },
        { from: 'switch', to: 'router' },
        { from: 'pc1', to: 'router' },
      ],
    }, solution);
    expect(v.correct).toBe(false);
    expect(v.feedback).toContain('sobran');
  });

  it('valida también la configuración IP cuando la solución la pide', () => {
    const withConfig = { ...solution, requiredConfig: { router: { ip: '192.168.1.1' } } };
    const v = evaluate('NETWORK_SIMULATION', {
      type: 'NETWORK_SIMULATION',
      connections: solution.requiredConnections,
      deviceConfig: { router: { ip: '192.168.1.1' } },
    }, withConfig);
    expect(v.correct).toBe(true);
  });
});

describe('puntuación', () => {
  it('cada pista recorta el puntaje', () => {
    expect(penaltyFor(0)).toBe(1);
    expect(activityScore(100, 1)).toBe(85);
    expect(activityScore(100, 3)).toBe(40);
    expect(activityScore(100, 9)).toBe(40);
  });

  it('promedia sobre el total de actividades, no sobre las respondidas', () => {
    expect(missionScore([100, 100], 5)).toBe(40);
  });

  it('3 estrellas exige puntaje alto y ningún fallo', () => {
    expect(starsFor(95, 0)).toBe(3);
    expect(starsFor(95, 1)).toBe(2);
    expect(starsFor(40, 3)).toBe(1);
  });
});

describe('barajado', () => {
  it('con el mismo seed da el mismo orden', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    expect(shuffleWithSeed(ids, 's1')).toEqual(shuffleWithSeed(ids, 's1'));
  });

  it('no pierde elementos', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    expect([...shuffleWithSeed(ids, 'x')].sort()).toEqual(ids);
  });
});
