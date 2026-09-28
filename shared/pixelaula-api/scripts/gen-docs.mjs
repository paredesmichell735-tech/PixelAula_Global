/**
 * Genera la tabla de endpoints a partir del catálogo.
 * Así la documentación no se desincroniza del código: se regenera.
 *   node scripts/gen-docs.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENDPOINT_LIST } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../../docs/ENDPOINTS.md');

const GROUPS = [
  ['Sistema', n => ['health', 'assetManifest'].includes(n)],
  ['Sesión y perfil', n => /^(session|registerProfile|me|updateMe|myProgress|myActivity|dashboard)$/.test(n)],
  ['Notificaciones', n => n.toLowerCase().includes('notification')],
  ['Objetivos, certificados y calendario', n => /goal|certification|calendar/i.test(n)],
  ['Avatar', n => /avatar/i.test(n)],
  ['Materias y mapa', n => /^(subjects?|subjectMissions|learningMap)$/.test(n)],
  ['Misiones', n => /^(missions?|missionBriefing|startMission)$/.test(n)],
  ['Intentos y actividades', n => /attempt|currentActivity|answer|hint|skipActivity|explainAnswer/i.test(n)],
  ['Logros, insignias y retos', n => /achievement|badge|challenge/i.test(n)],
  ['Racha', n => /streak/i.test(n)],
  ['Economía', n => /shop|purchase|inventory|equipItem|useItem/i.test(n)],
  ['Comunidad', n => /leaderboard|friend|class|community|post|team/i.test(n)],
  ['Búsqueda', n => n === 'search'],
  ['Administración', n => n.startsWith('admin')],
];

const used = new Set();
let md = `# Endpoints de PixelAula

Generado desde \`shared/pixelaula-api/src/endpoints.ts\`. No lo edites a mano:
vuelve a ejecutar \`node scripts/gen-docs.mjs\` en \`shared/pixelaula-api\`.

Base: \`/api/v1\` · Envelope: \`{ success, data, error }\` · Auth: \`Authorization: Bearer <jwt de Supabase>\`

**${ENDPOINT_LIST.length} endpoints.** La columna *Lenta* marca los que pueden llamar al
modelo de IA: los clientes les dan 60 s de timeout y el backend les aplica el
rate limit estricto.

`;

for (const [title, match] of GROUPS) {
  const rows = ENDPOINT_LIST.filter(e => !used.has(e.name) && match(e.name));
  rows.forEach(r => used.add(r.name));
  if (!rows.length) continue;
  md += `\n## ${title}\n\n| Método | Ruta | Qué hace | Auth | Lenta |\n|---|---|---|:--:|:--:|\n`;
  for (const r of rows) {
    md += `| \`${r.method}\` | \`${r.path}\` | ${r.summary} | ${r.auth ? 'Sí' : 'No'} | ${r.slow ? 'Sí' : '' } |\n`;
  }
}

const rest = ENDPOINT_LIST.filter(e => !used.has(e.name));
if (rest.length) {
  md += `\n## Sin agrupar\n\n| Método | Ruta | Qué hace |\n|---|---|---|\n`;
  for (const r of rest) md += `| \`${r.method}\` | \`${r.path}\` | ${r.summary} |\n`;
}

md += `\n\n## Cómo se consume\n\nWeb y app usan el mismo cliente, así que el flujo es idéntico en los dos:\n\n\`\`\`ts
import { PixelAulaClient } from '@pixelaula/api';

export const api = new PixelAulaClient({
  baseUrl: import.meta.env.VITE_API_URL,       // móvil: process.env.EXPO_PUBLIC_API_URL
  getToken: () => supabase.auth.getSession().then(r => r.data.session?.access_token ?? null),
  onRefresh: () => supabase.auth.refreshSession().then(r => r.data.session?.access_token ?? null),
  onAuthError: () => router.navigate('/login'),
});

const panel = await api.dashboard();
\`\`\`\n`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md, 'utf8');
console.log('Escrito', out, '·', ENDPOINT_LIST.length, 'endpoints');
