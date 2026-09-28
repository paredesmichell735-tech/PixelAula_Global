/**
 * Prueba de humo de punta a punta contra el backend y el Supabase real.
 * Crea un usuario de test, hace login y recorre el flujo de una misión.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const API = 'http://127.0.0.1:3000/api/v1';
const URL = process.env.SUPABASE_URL;
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });
const anon = createClient(URL, PUB, { auth: { persistSession: false } });

const email = `test.pixelaula+${Date.now()}@example.com`;
const password = `Pa-${randomUUID().slice(0, 12)}`;

let token = null;
let pass = 0;
let fail = 0;


/** Construye una respuesta para cualquier tipo de actividad. */
function buildAnswer(activity, { wrong = false } = {}) {
  switch (activity.type) {
    case 'TRUE_FALSE':
      return { type: 'TRUE_FALSE', value: !wrong };
    case 'ORDERING':
      return { type: 'ORDERING', order: wrong ? [...(activity.orderingItems ?? [])].reverse() : (activity.orderingItems ?? []) };
    case 'MATCHING': {
      const pairs = activity.matchingPairs ?? [];
      // Para fallar a propósito se rotan las definiciones: el esquema exige
      // al menos un par, así que mandar la lista vacía sería un 422, no un fallo.
      const shifted = pairs.map((pair, i) => ({
        concept: pair.concept,
        definition: pairs[(i + 1) % pairs.length]?.definition ?? pair.definition,
      }));
      return { type: 'MATCHING', pairs: wrong && pairs.length > 1 ? shifted : pairs };
    }
    case 'SQL_CHALLENGE':
      return { type: 'SQL_CHALLENGE', value: wrong ? 'nada' : (activity.sqlData?.options?.[0] ?? '') };
    case 'DRAG_DROP':
      return { type: 'DRAG_DROP', placements: {} };
    case 'NETWORK_SIMULATION':
      return { type: 'NETWORK_SIMULATION', connections: wrong ? [] : (activity.networkData?.requiredConnections ?? []) };
    case 'CIRCUIT_SIMULATION':
      return { type: 'CIRCUIT_SIMULATION', components: [], connections: [] };
    default:
      return { type: activity.type, optionId: activity.options?.[wrong ? activity.options.length - 1 : 0]?.id ?? 'a' };
  }
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: json };
}

function check(label, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  OK   ${label}`);
  } else {
    fail++;
    console.log(`  FALLA ${label} ${detail}`);
  }
}

console.log('\n=== 1. Alta de usuario ===');
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: 'Tester', username: `tester${Date.now() % 100000}` },
});
check('createUser', !created.error, created.error?.message ?? '');
const userId = created.data?.user?.id;

const signIn = await anon.auth.signInWithPassword({ email, password });
check('signInWithPassword', !signIn.error, signIn.error?.message ?? '');
token = signIn.data?.session?.access_token ?? null;
check('token recibido', Boolean(token));

console.log('\n=== 2. Perfil creado por el trigger ===');
const me = await call('GET', '/me');
check('GET /me responde 200', me.status === 200, JSON.stringify(me.body?.error ?? ''));
check('tiene username', Boolean(me.body?.data?.username), me.body?.data?.username);
check('nivel inicial 1', me.body?.data?.level === 1);
check('avatar con piezas por defecto', Object.keys(me.body?.data?.avatar ?? {}).length > 10,
  `categorias: ${Object.keys(me.body?.data?.avatar ?? {}).length}`);

console.log('\n=== 3. Catálogo ===');
const subjects = await call('GET', '/subjects');
check('GET /subjects trae las 6 materias', subjects.body?.data?.length === 6,
  `recibidas: ${subjects.body?.data?.length}`);

const map = await call('GET', '/map');
check('GET /map devuelve el árbol', Array.isArray(map.body?.data?.subjects));
check('el mapa trae nodos', (map.body?.data?.subjects ?? []).some(s => s.nodes.length > 0));

const catalog = await call('GET', '/avatar/catalog');
check('GET /avatar/catalog trae 17 categorías', catalog.body?.data?.categories?.length === 17,
  `recibidas: ${catalog.body?.data?.categories?.length}`);

console.log('\n=== 4. Panel ===');
const dash = await call('GET', '/me/dashboard');
check('GET /me/dashboard responde', dash.status === 200, JSON.stringify(dash.body?.error ?? ''));
check('el panel trae racha', dash.body?.data?.streak !== undefined);

console.log('\n=== 5. Misión de circuitos ===');
const fisica = subjects.body?.data?.find(s => s.slug === 'fisica-electrica');
const missions = await call('GET', `/subjects/${fisica?.id}/missions`);
check('la materia tiene misiones', (missions.body?.data?.length ?? 0) >= 3,
  `recibidas: ${missions.body?.data?.length}`);

const first = missions.body?.data?.[0];
check('la primera está ACTIVE', first?.status === 'ACTIVE', `estado: ${first?.status}`);

const locked = missions.body?.data?.[2];
const lockedStart = await call('POST', `/missions/${locked?.id}/attempts`);
check('una misión bloqueada devuelve MISSION_LOCKED',
  lockedStart.body?.error?.code === 'MISSION_LOCKED', lockedStart.body?.error?.code ?? '');

console.log('\n=== 6. Intento completo ===');
const start = await call('POST', `/missions/${first?.id}/attempts`);
check('POST /missions/:id/attempts crea el intento', start.status === 201,
  JSON.stringify(start.body?.error ?? ''));
const attemptId = start.body?.data?.attempt?.id;
const activity = start.body?.data?.activity;
check('devuelve la primera actividad', Boolean(activity), activity?.type ?? '');

// ANTITRAMPA: la actividad no puede traer la solución.
const serialized = JSON.stringify(activity ?? {});
check('la actividad NO filtra la solución',
  !serialized.includes('solution') && !serialized.includes('isCorrect') && !serialized.includes('explanation'));

const resumed = await call('POST', `/missions/${first?.id}/attempts`);
check('volver a iniciar reanuda en vez de duplicar', resumed.body?.data?.resumed === true);

// Responder mal a propósito para comprobar el veredicto y la explicación.
const clientAttemptId = randomUUID();
const wrongAnswer = buildAnswer(activity, { wrong: true });
const wrong = await call('POST', `/attempts/${attemptId}/answer`, {
  clientAttemptId,
  answer: wrongAnswer,
});
check('POST /answer responde', wrong.status === 200, JSON.stringify(wrong.body?.error ?? ''));
const wrongData = wrong.body?.data;

const repeat = await call('POST', `/attempts/${attemptId}/answer`, {
  clientAttemptId,
  answer: wrongAnswer,
});
check('reenviar el mismo clientAttemptId es idempotente', repeat.body?.data?.duplicate === true);

if (!wrongData?.correct) {
  const explain = await call('POST', `/answers/${wrongData?.answerId}/explain`);
  check('POST /answers/:id/explain devuelve markdown',
    typeof explain.body?.data?.markdown === 'string' && explain.body.data.markdown.length > 40,
    JSON.stringify(explain.body?.error ?? ''));
}

// Terminar la misión respondiendo lo que quede.
let guard = 0;
let current = wrongData?.nextActivity;
while (current && guard++ < 20) {
  const answer = buildAnswer(current);

  const res = await call('POST', `/attempts/${attemptId}/answer`, {
    clientAttemptId: randomUUID(),
    answer,
  });
  if (res.status !== 200) {
    check(`responder ${current.type}`, false, JSON.stringify(res.body?.error ?? ''));
    break;
  }
  if (res.body.data.finished) {
    const result = res.body.data.result;
    check('la misión se cierra sola al acabar', Boolean(result));
    check('el resultado trae estrellas', typeof result?.stars === 'number', `estrellas: ${result?.stars}`);
    check('el resultado trae XP', typeof result?.xpAwarded === 'number', `xp: ${result?.xpAwarded}`);
    check('el resultado trae nota del profesor', typeof result?.teacherNote === 'string');
    check('desbloquea la siguiente misión', Boolean(result?.nextMissionId));
    break;
  }
  current = res.body.data.nextActivity;
}

console.log('\n=== 7. Efectos de completar ===');
const after = await call('GET', '/me');
check('el XP subió', (after.body?.data?.currentXp ?? 0) > 0, `xp: ${after.body?.data?.currentXp}`);
check('ganó Pixeles', (after.body?.data?.pixelsCoins ?? 0) > 0, `pixeles: ${after.body?.data?.pixelsCoins}`);

const streak = await call('GET', '/streak');
check('la racha arrancó', (streak.body?.data?.currentDays ?? 0) >= 1, `dias: ${streak.body?.data?.currentDays}`);

const achievements = await call('GET', '/achievements');
const unlocked = (achievements.body?.data ?? []).filter(a => a.unlocked);
check('desbloqueó algún logro', unlocked.length > 0, `logros: ${unlocked.map(a => a.title).join(', ')}`);

const feed = await call('GET', '/me/activity');
check('el feed registró la actividad', (feed.body?.data?.items?.length ?? 0) > 0);

console.log('\n=== 8. Economía y comunidad ===');
const shop = await call('GET', '/shop/items');
check('la tienda tiene objetos', (shop.body?.data?.length ?? 0) > 0, `items: ${shop.body?.data?.length}`);

const board = await call('GET', '/leaderboard?scope=global&period=all');
check('el ranking responde', board.status === 200, JSON.stringify(board.body?.error ?? ''));
check('aparezco en el ranking', Boolean(board.body?.data?.me));

const classes = await call('GET', '/classes');
check('hay clases', (classes.body?.data?.length ?? 0) > 0);

const join = await call('POST', '/classes/join', { code: 'PIXEL10' });
check('unirse a una clase por código', join.status === 201, JSON.stringify(join.body?.error ?? ''));

const style = await call('POST', '/me/avatar/styles', { name: 'Mi estilo' });
check('guardar un estilo de avatar', style.status === 201, JSON.stringify(style.body?.error ?? ''));

const badItem = await call('PUT', '/me/avatar', { ...after.body.data.avatar, headwear: 'corona-pixel' });
check('no deja equipar una pieza que no tienes',
  badItem.body?.error?.code === 'ITEM_NOT_OWNED', badItem.body?.error?.code ?? 'sin error');

console.log('\n=== 9. Limpieza ===');
if (userId) {
  const del = await admin.auth.admin.deleteUser(userId);
  check('usuario de prueba borrado', !del.error, del.error?.message ?? '');
}

console.log(`\n=========================================`);
console.log(`  ${pass} OK · ${fail} fallos`);
console.log(`=========================================\n`);
process.exit(fail > 0 ? 1 : 0);
