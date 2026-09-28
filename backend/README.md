# RPG Code Academy · Backend

API de una plataforma educativa gamificada que enseña **programación** con temática RPG
pixel art. Este repositorio es **solo backend**: lo consumen dos clientes independientes
(una web y una app Android nativa), y es la única fuente de verdad del juego.

- **Stack**: Node.js 20+ · Express 4 · TypeScript · Supabase (Postgres + Auth + Storage) · Zod · Anthropic (Claude)
- **Documentación viva**: `http://localhost:3000/api/docs` (Swagger UI) y `/api/openapi.json`
- **Contrato para el cliente Android**: [`API.md`](./API.md)
- **Ejemplos ejecutables**: [`requests.http`](./requests.http)

---

## 1. Requisitos

- Node.js 20 o superior
- Una cuenta de [Supabase](https://supabase.com) (el plan gratuito sobra), o Docker Desktop
  si prefieres levantar el stack de Supabase en local
- La CLI de Supabase ya viene como dependencia del proyecto: no hay que instalarla aparte
- Opcional: una API key de Anthropic (sin ella el backend funciona con el proveedor `mock`)

## 2. Instalación

```bash
npm install
```

```bash
cp .env.example .env
```

## 3. Supabase

La CLI de Supabase está incluida como dependencia de desarrollo, así que no hace falta
instalarla aparte: todo va con `npm run db:*`.

```
supabase/
  config.toml     configuración del proyecto (API, Auth, Storage, buckets)
  migrations/     el esquema, en orden. Se aplican con `db push` / `db reset`
  seed.sql        datos de demo. Solo en local o bajo petición explícita
  assets/         sprites que se suben al bucket `assets` en el reset local
```

Hay **dos formas de trabajar**. Puedes usar solo la B si no quieres instalar Docker.

### Opción A · Stack local con Docker (recomendada para desarrollar)

Levanta Postgres, Auth, Storage y Studio en tu máquina. Necesita Docker Desktop corriendo.

```bash
npm run db:start
```

La primera vez descarga las imágenes (unos minutos). Al terminar imprime las URLs y las
claves locales; cópialas a tu `.env`:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<el anon key que imprimió>
SUPABASE_SERVICE_ROLE_KEY=<el service_role key que imprimió>
```

Vuelve a verlas cuando quieras con `npm run db:status`. Studio queda en
<http://127.0.0.1:54323>.

```bash
npm run db:reset
```

Borra la base local, aplica **todas** las migraciones en orden y ejecuta `seed.sql`. Es el
comando que más vas a usar: deja la base limpia y con un mundo jugable en segundos.

```bash
npm run db:stop
```

### Opción B · Proyecto en la nube

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **Project Settings → API**, copia en tu `.env`:
   - `SUPABASE_URL` → *Project URL*
   - `SUPABASE_ANON_KEY` → *anon public*
   - `SUPABASE_SERVICE_ROLE_KEY` → *service_role* ⚠️ **esta clave jamás sale del backend**
3. Enlaza el repo con el proyecto (pide la contraseña de la base):

```bash
npm run db:link -- --project-ref TU_PROJECT_REF
```

4. Mira qué se va a aplicar y luego aplícalo:

```bash
npm run db:push:dry
```

```bash
npm run db:push
```

5. Activa los proveedores de login en **Authentication → Providers**: Email y, si lo
   quieres, Google.

`db push` **no** aplica `seed.sql`: los datos de demo no deberían colarse en producción por
accidente. Si quieres el mundo de ejemplo también en la nube (útil en un proyecto de
pruebas), pídelo explícitamente:

```bash
npm run db:seed:remote
```

### Trabajar con migraciones

Nunca edites una migración que ya se aplicó: crea una nueva.

```bash
npm run db:new nombre_del_cambio
```

Crea `supabase/migrations/<timestamp>_nombre_del_cambio.sql` vacío para que escribas el SQL.
Si prefieres tocar el esquema desde Studio y capturar el resultado:

```bash
npm run db:diff nombre_del_cambio
```

compara tu base local contra las migraciones y genera el archivo con la diferencia.

```bash
npm run db:list
```

muestra qué migraciones están aplicadas en local y cuáles en remoto: sirve para detectar
que alguien tocó producción a mano.

| Comando | Qué hace |
|---|---|
| `npm run db:start` / `db:stop` / `db:status` | Levanta, para y consulta el stack local |
| `npm run db:reset` | Base local limpia: migraciones + seed |
| `npm run db:new <nombre>` | Crea una migración vacía |
| `npm run db:diff <nombre>` | Genera una migración desde los cambios locales |
| `npm run db:list` | Compara el historial local con el remoto |
| `npm run db:link -- --project-ref X` | Enlaza con el proyecto en la nube |
| `npm run db:push:dry` / `db:push` | Simula / aplica las migraciones en remoto |
| `npm run db:seed:remote` | Aplica también `seed.sql` en remoto |
| `npm run db:pull` | Trae a una migración cambios hechos a mano en remoto |
| `npm run db:types` | Genera tipos TypeScript desde la base local |

### Qué trae el seed

Un mundo completo y jugable **sin llamar a la IA**: 14 conceptos de programación,
2 capítulos, 5 niveles (uno de ellos un jefe), una lección con ejemplos resueltos, 3
ejercicios (opción múltiple, rellenar hueco y código), 6 ítems de tienda y 6 logros. Es
idempotente: ejecutarlo dos veces no duplica nada.

### Storage para los sprites

En **local**, `config.toml` ya declara el bucket público `assets`; pon los PNG en
`supabase/assets/` (respetando las rutas de `asset_manifest`: `sprites/hero_coder.png`,
`backgrounds/forest_day.png`…) y `npm run db:reset` los sube solo.

En **la nube**, crea a mano un bucket público llamado `assets` en **Storage** y sube ahí el
pixel art. El backend no genera arte: solo entrega la `sprite_key` y su URL.

Si prefieres un bucket privado, pon `ASSETS_PUBLIC=false` y el manifiesto devolverá URLs
firmadas con la caducidad de `ASSETS_SIGNED_URL_TTL`.

## 4. Configurar la IA

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-opus-5
```

Para desarrollar sin gastar, usa `AI_PROVIDER=mock`: devuelve contenido fijo validado con
los mismos esquemas Zod que el proveedor real. El proveedor vive detrás de la interfaz
`AIProvider` (`src/ai/types.ts`), así que cambiar de LLM es escribir otra clase.

## 5. Arrancar

```bash
npm run dev
```

```bash
npm run build && npm start
```

Comprueba que responde:

```bash
curl http://localhost:3000/api/v1/health
```

## 6. Tests

```bash
npm test
```

Cubren las reglas de combate y progresión (daño, pistas, puntaje, estrellas, desenlace),
la calificación determinista, la regla antitrampa y los endpoints principales con la IA
mockeada. No necesitan una base de datos real.

```bash
npm run typecheck
```

## 7. Crear un administrador

Los endpoints `/admin/*` exigen `profiles.is_admin = true`. Regístrate por la app y luego,
en el SQL Editor de Supabase:

```sql
update profiles set is_admin = true where username = 'tu_username';
```

Por seguridad, un usuario no puede darse permisos de admin a sí mismo: un trigger bloquea
el cambio de esa columna desde cualquier rol que no sea `service_role`.

## 8. Cómo está organizado

```
src/
  config/        env.ts · valida las variables de entorno al arrancar
  lib/           supabase, logger, errores, envelope de respuesta
  middleware/    auth (requireAuth/requireAdmin), validate, rateLimit, error central
  ai/            AIProvider, esquemas Zod de salida, prompts versionados, logging de costos
  repositories/  acceso a datos (Supabase). Nada de reglas de negocio aquí
  services/      las reglas del juego: combate, progresión, contenido, economía, meta
  controllers/   traducen HTTP <-> servicios
  routes/        definición de rutas y middlewares por ruta
  docs/          especificación OpenAPI que sirve /api/docs
supabase/
  config.toml          configuración local: API, Auth, Storage, buckets
  migrations/          esquema, RLS, funciones y triggers, en orden
  seed.sql             mundo de demo para probar sin IA
  assets/              sprites que se suben al bucket en el reset local
tests/                 unitarios de reglas + integración de endpoints
```

Regla: la lógica de negocio no vive en los controllers, y las transacciones que tocan XP,
monedas y desbloqueos a la vez viven en funciones Postgres (`complete_level`,
`purchase_item`), no repartidas en varias escrituras sueltas.

## 9. Decisiones que conviene conocer

**Antitrampa.** La respuesta correcta nunca sale del servidor antes de que el jugador
responda. `exercises` tiene RLS activo **sin** política de lectura para usuarios: solo el
backend con `service_role` la lee, y expone únicamente las columnas públicas. Daño, XP,
monedas y desbloqueos se calculan aquí. Asume que el APK se puede decompilar.

**Idempotencia.** `POST /sessions/:id/answer` acepta un `client_attempt_id` (UUID que
genera el cliente). Un reenvío por mala red devuelve el resultado original en vez de
penalizar dos veces.

**Contenido con caché permanente.** La lección y los ejercicios de un nivel se generan una
sola vez y quedan guardados; el resto de jugadores reutiliza lo mismo. Dos jugadores que
entran a la vez a un nivel vacío disparan una sola generación (`src/services/content.service.ts`).

**Control de costos.** Cada llamada al modelo queda registrada en `ai_generation_logs` con
tokens, costo y latencia. `GET /admin/ai-costs` resume el gasto de 30 días. Los endpoints
que llaman a la IA tienen un rate limit más estricto que el resto.

**Repetir un nivel** da el 25% de la recompensa original, para que no se pueda farmear el
primer nivel. Se cambia en la función `complete_level`.

## 10. Variables de entorno

Todas están documentadas en [`.env.example`](./.env.example). Las obligatorias son
`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; con `AI_PROVIDER=anthropic`
también `ANTHROPIC_API_KEY`. Si falta alguna, el proceso no arranca y dice cuál.

## 11. Despliegue

1. `npm run build` genera `dist/`.
2. Arranca con `npm start` (Railway, Render, Fly.io o un contenedor Node cualquiera).
3. Define las variables de entorno en el proveedor; **nunca** subas el `.env`.
4. Pon en `CORS_ORIGINS` el dominio real de la web. La app Android no envía `Origin`, así
   que no le afecta CORS.
5. `NODE_ENV=production` deja de exponer los mensajes de error internos.
