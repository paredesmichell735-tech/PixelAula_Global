# API · RPG Code Academy

Guía para quien construye los clientes (web y **app Android**). Todo lo que necesitas para
integrar está aquí; la versión interactiva vive en `/api/docs`.

- **Base URL local**: `http://localhost:3000/api/v1`
- **Base URL producción**: `https://api.tu-dominio.com/api/v1`
- Todas las peticiones y respuestas son `application/json` en UTF-8.

---

## 1. Autenticación

El backend **no tiene login propio**. El cliente se autentica directamente contra Supabase
Auth con el SDK oficial (email/contraseña o Google), y manda el access token en cada
petición:

```
Authorization: Bearer <access_token>
```

En Android:

```kotlin
// build.gradle: io.github.jan-tennert.supabase:gotrue-kt
val supabase = createSupabaseClient(supabaseUrl = URL, supabaseKey = ANON_KEY) {
    install(GoTrue)
}

supabase.gotrue.loginWith(Email) {
    email = "jugador@ejemplo.com"
    password = "..."
}

val token = supabase.gotrue.currentAccessTokenOrNull()
```

Notas importantes:

- El token caduca (1 hora por defecto). El SDK lo refresca solo; **lee el token en cada
  petición**, no lo guardes al arrancar la app.
- Si el backend responde `401 UNAUTHORIZED`, refresca la sesión y reintenta una vez. Si
  vuelve a fallar, manda al usuario al login.
- La `service_role key` es del servidor. En la app solo va la `anon key`.

**Rutas públicas** (sin token): `GET /health` y `GET /assets/manifest`.

---

## 2. Formato de las respuestas

Éxito:

```json
{ "success": true, "data": { }, "error": null }
```

Error:

```json
{ "success": false, "data": null, "error": { "code": "LEVEL_LOCKED", "message": "Este nivel todavía no está desbloqueado." } }
```

Haz `switch` sobre `error.code`, nunca sobre `error.message` (el mensaje puede cambiar,
el código no). En errores de validación llega además `error.details` con los campos.

### Códigos de error

| Código | HTTP | Significado | Qué hacer en el cliente |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Token ausente, inválido o caducado | Refrescar sesión y reintentar; si falla, ir a login |
| `FORBIDDEN` | 403 | No es administrador | Ocultar la pantalla de admin |
| `LEVEL_LOCKED` | 403 | El nivel anterior no está completado | Mostrar el candado |
| `CHARACTER_LEVEL_TOO_LOW` | 403/409 | Falta nivel de personaje | "Necesitas ser nivel N" |
| `NOT_FOUND` | 404 | El recurso no existe o no es tuyo | Volver al mapa |
| `ROUTE_NOT_FOUND` | 404 | URL mal formada | Error de programación |
| `CHARACTER_REQUIRED` | 409 | Aún no hay personaje | Llevar a la creación de personaje |
| `CHARACTER_ALREADY_EXISTS` | 409 | Ya tiene personaje | Ir al mapa |
| `SESSION_ALREADY_FINISHED` | 409 | La partida terminó | Mostrar el resumen |
| `NO_CURRENT_EXERCISE` | 409 | No quedan ejercicios | Cerrar la partida |
| `NO_MORE_HINTS` | 409 | Se acabaron las pistas | Deshabilitar el botón |
| `NO_CONTENT_AVAILABLE` | 409 | El nivel no tiene ejercicios | Reintentar más tarde |
| `INSUFFICIENT_COINS` | 409 | Faltan monedas | "No te alcanza" |
| `ITEM_NOT_OWNED` | 409 | No tiene ese objeto | Ofrecer la tienda |
| `ITEM_NOT_USABLE_HERE` | 409 | Ese objeto se usa en combate | Mensaje informativo |
| `SESSION_REQUIRED` | 409 | La poción necesita un combate activo | Mensaje informativo |
| `STREAK_ALREADY_CLAIMED` | 409 | Ya reclamó hoy | Deshabilitar el botón |
| `USERNAME_TAKEN` | 409 | Username ocupado | Pedir otro |
| `ATTEMPT_WAS_CORRECT` | 409 | Ese intento fue correcto | No pedir explicación |
| `VALIDATION_ERROR` | 422 | Body/params inválidos | Revisar `error.details` |
| `RATE_LIMITED` | 429 | Demasiadas peticiones | Backoff |
| `AI_RATE_LIMITED` | 429 | Demasiadas llamadas a la IA | "Respira un momento" |
| `AI_GENERATION_FAILED` | 502 | El modelo falló tras los reintentos | Ofrecer reintentar |
| `INTERNAL_ERROR` | 500 | Fallo del servidor | Mensaje genérico |

### Límites de peticiones

- General: 120 por minuto y usuario.
- Endpoints que llaman a la IA (lección, iniciar partida, responder, explicar, admin/generate):
  10 por minuto y usuario.

Ambos devuelven las cabeceras `RateLimit-*`.

---

## 3. Perfil y personaje

### `GET /me`

Perfil, personaje y resumen. Es la primera llamada tras el login.

**Respuesta 200**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "3f2b...",
      "username": "frisk_dev",
      "avatar_key": "avatar_02",
      "avatar_url": "https://...supabase.co/storage/v1/object/public/assets/avatar_02.png",
      "is_admin": false,
      "created_at": "2026-09-01T10:00:00.000Z"
    },
    "character": {
      "id": "9a1c...",
      "name": "Frisk",
      "class": "coder",
      "level": 3,
      "xp": 340,
      "xp_for_current_level": 300,
      "xp_for_next_level": 600,
      "xp_progress": 0.133,
      "hp_max": 120,
      "hp_current": 120,
      "coins": 85,
      "sprite_key": "hero_coder",
      "sprite_url": "https://.../hero_coder.png"
    },
    "progress": { "levels_completed": 4 },
    "streak": { "current_days": 3, "longest_days": 7 }
  },
  "error": null
}
```

`character` es `null` si todavía no lo creó: en ese caso, lleva al usuario a la pantalla de
creación de personaje.

**Errores**: `401 UNAUTHORIZED`, `404 NOT_FOUND` (perfil no creado; no debería pasar, el
trigger lo crea al registrarse).

---

### `PATCH /me`

```json
{ "username": "frisk_dev", "avatar_key": "avatar_02" }
```

Ambos campos son opcionales, pero hay que mandar al menos uno. `username`: 3-20 caracteres,
solo letras, números y `_`.

**200** devuelve el perfil actualizado.
**Errores**: `409 USERNAME_TAKEN`, `422 VALIDATION_ERROR`.

---

### `POST /characters`

Crea el personaje inicial y **desbloquea el primer nivel del mapa**.

```json
{ "name": "Frisk", "class": "coder" }
```

Clases: `coder` (100 HP), `debugger` (120 HP), `architect` (90 HP). Solo cambian los stats
iniciales, no el contenido.

**201** devuelve el objeto `character`.
**Errores**: `409 CHARACTER_ALREADY_EXISTS`, `422 VALIDATION_ERROR`.

---

### `GET /characters/me`

**200** el objeto `character`. **Errores**: `409 CHARACTER_REQUIRED`.

---

## 4. Mapa y progresión

### `GET /map`

Mundos → capítulos → niveles con el estado de bloqueo del usuario, **en una sola llamada**.
Está pensado para que la app pinte el mapa completo sin peticiones extra.

**Respuesta 200 (recortada)**

```json
{
  "success": true,
  "data": {
    "worlds": [
      {
        "id": "1111...",
        "slug": "bosque-de-las-variables",
        "name": "El Bosque de las Variables",
        "order": 1,
        "sprite_key": "world_forest",
        "sprite_url": "https://.../world_forest.png",
        "color_palette": {
          "bg": "#1a1c2c", "surface": "#333c57", "primary": "#f4f4f4",
          "accent": "#a7f070", "danger": "#b13e53", "xp": "#ffcd75"
        },
        "chapters": [
          {
            "id": "2222...",
            "name": "Variables y Tipos",
            "order": 1,
            "base_difficulty": 2,
            "levels": [
              {
                "id": "3333...",
                "name": "Qué es una Variable",
                "order": 1,
                "type": "lesson",
                "difficulty": 1,
                "xp_reward": 30,
                "coins_reward": 5,
                "enemy_name": "Slime de Sintaxis",
                "enemy_sprite_key": "enemy_slime",
                "enemy_sprite_url": "https://.../enemy_slime.png",
                "status": "completed",
                "stars": 3,
                "best_score": 100
              }
            ]
          }
        ]
      }
    ],
    "summary": { "levels_total": 5, "levels_completed": 1, "stars_total": 3 }
  },
  "error": null
}
```

`status`: `locked` · `unlocked` · `in_progress` · `completed`.
`type`: `lesson` · `combat` · `boss` (el jefe cierra cada capítulo).
`color_palette` es la paleta del mundo: úsala para que web y Android se vean idénticos.

---

### `GET /levels/{id}`

Detalle del nivel: metadata, sprites, narrativa y estado.

**200 (recortada)**

```json
{
  "success": true,
  "data": {
    "id": "3333...",
    "name": "Los Cuatro Tipos",
    "type": "combat",
    "difficulty": 2,
    "concepts": ["data-types", "variables"],
    "xp_reward": 50,
    "coins_reward": 10,
    "exercise_count": 4,
    "status": "unlocked",
    "stars": 0,
    "best_score": 0,
    "attempts": 1,
    "content_ready": true,
    "world": { "id": "1111...", "name": "El Bosque de las Variables", "color_palette": { } },
    "enemy": {
      "name": "Murciélago Tipado",
      "sprite_key": "enemy_bat",
      "sprite_url": "https://.../enemy_bat.png",
      "hp": 100,
      "damage": 22
    },
    "background_url": "https://.../forest_day.png",
    "narrative": {
      "intro": ["Un murciélago chilla en binario.", "Cambia de tipo al parpadear.", "* Atrápalo con el tipo correcto."],
      "victory": ["El murciélago cae, correctamente tipado.", "* Sigues adelante."],
      "defeat": ["Te quedas sin HP.", "* Vuelve a intentarlo."]
    }
  },
  "error": null
}
```

Los textos de `narrative` **ya vienen cortados en líneas cortas** (máximo ~60 caracteres,
hasta 3 líneas) para la caja de diálogo pixel art: píntalos tal cual, sin recortar.

`content_ready: false` significa que el nivel aún no tiene ejercicios generados; la primera
llamada a `/lesson` o a `/sessions` los crea (puede tardar unos segundos).

**Errores**: `404 NOT_FOUND`.

---

### `GET /levels/{id}/lesson`

La lección previa al combate. La genera la IA la primera vez que alguien entra y queda
cacheada para siempre: las llamadas siguientes son rápidas.

**200**

```json
{
  "success": true,
  "data": {
    "id": "aaaa...",
    "level_id": "3333...",
    "title": "Qué es una Variable",
    "content_md": "# Variables\n\nUna variable es una **caja con nombre**...",
    "key_points": ["let cambia", "const no se reasigna", "Declara antes de usar"],
    "worked_examples": [
      {
        "title": "Declarar y reasignar",
        "problem": "Guarda 100 puntos de vida y réstale 20.",
        "solution": "let vida = 100;\nvida = vida - 20;",
        "explanation": "Usamos let porque el valor cambia."
      }
    ],
    "concepts": ["variables"],
    "generated_at": "2026-09-06T12:00:00.000Z"
  },
  "error": null
}
```

`content_md` es **Markdown** con bloques ` ```js `. En Android puedes usar Markwon con la
extensión de sintaxis para pintarlo.

**Primera llamada**: puede tardar 5-20 s (genera con IA). Muestra un loader con tono de
juego, no un spinner mudo.
**Errores**: `403 LEVEL_LOCKED`, `429 AI_RATE_LIMITED`, `502 AI_GENERATION_FAILED`.

---

## 5. Combate

El combate es una **sesión**: se abre una partida del nivel, se responden ejercicios, y el
servidor decide daño, puntaje y recompensas.

> **Regla que no se negocia**: la respuesta correcta nunca viaja al cliente antes de que el
> jugador responda. No intentes validar en local: la app puede decompilarse.

### `POST /levels/{id}/sessions`

Inicia la partida. Si ya había una activa en ese nivel, **la reanuda** (`resumed: true`) en
vez de crear otra.

**201**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "5555...",
      "level_id": "3333...",
      "status": "active",
      "hp": { "current": 120, "max": 120 },
      "enemy_hp": { "current": 100, "max": 100 },
      "exercise_index": 0,
      "exercise_total": 4,
      "correct_count": 0,
      "score": 0,
      "stars": 0
    },
    "exercise": {
      "id": "6666...",
      "index": 1,
      "total": 4,
      "type": "multiple_choice",
      "prompt": "¿Qué palabra clave usarías para un valor que NO se va a reasignar?",
      "code_context": null,
      "language": "javascript",
      "options": [
        { "id": "a", "text": "let" },
        { "id": "b", "text": "const" },
        { "id": "c", "text": "var" },
        { "id": "d", "text": "function" }
      ],
      "concept": "variables",
      "difficulty": 1,
      "hints_available": 3,
      "time_limit_sec": null
    },
    "enemy": { "name": "Slime de Sintaxis", "sprite_url": "https://.../enemy_slime.png", "hp": 75 },
    "narrative": { "intro": ["Un slime gelatinoso te cierra el paso."] },
    "resumed": false
  },
  "error": null
}
```

**Errores**: `403 LEVEL_LOCKED`, `403/409 CHARACTER_LEVEL_TOO_LOW`, `409 CHARACTER_REQUIRED`,
`409 NO_CONTENT_AVAILABLE`, `429 AI_RATE_LIMITED`.

---

### `GET /sessions/{id}`

Estado actual de la partida. **Úsalo al volver a abrir la app**: si el jugador cerró la
aplicación en mitad de un combate, esto lo devuelve exactamente donde estaba.

**200**: el objeto `session` más `exercise` (el ejercicio actual, o `null` si terminó).

---

### `GET /sessions/{id}/current`

Solo el ejercicio actual, **sin la respuesta correcta**.

**200**: un objeto `exercise` como el de arriba.
**Errores**: `409 SESSION_ALREADY_FINISHED`, `409 NO_CURRENT_EXERCISE`.

---

### `POST /sessions/{id}/answer`

Envía la respuesta. **Es idempotente**: manda un `client_attempt_id` (un UUID que genera la
app). Si la red falla y reintentas con el mismo id, el servidor devuelve el resultado
original en vez de contar un segundo fallo.

**Petición**

```json
{
  "client_attempt_id": "8f1f2b0e-6d3a-4c2e-9a51-3f8a1d2b7c40",
  "answer": "b",
  "time_spent_ms": 4200
}
```

El formato de `answer` según el tipo de ejercicio:

| `type` | `answer` | Ejemplo |
|---|---|---|
| `multiple_choice` | id de la opción | `"b"` o `{"option_id": "b"}` |
| `fill_blank` | el texto del hueco | `"let"` |
| `code` | el código completo | `"function crearHeroe(nombre) { ... }"` |
| `open` | la respuesta en texto | `"const no permite reasignar porque..."` |

`multiple_choice` y `fill_blank` se validan de forma determinista en el servidor (rápido).
`code` y `open` los califica la IA contra una rúbrica: **tarda más** (3-15 s), así que
bloquea el botón y muestra una animación de ataque mientras tanto.

**200**

```json
{
  "success": true,
  "data": {
    "duplicate": false,
    "correct": true,
    "score": 85,
    "damage_dealt": 21,
    "damage_taken": 0,
    "feedback": "¡Golpe certero!",
    "next_step": null,
    "attempt_id": "7777...",
    "can_explain": false,
    "session": {
      "id": "5555...",
      "status": "active",
      "hp": { "current": 120, "max": 120 },
      "enemy_hp": { "current": 54, "max": 75 },
      "exercise_index": 1,
      "exercise_total": 4,
      "correct_count": 1,
      "score": 0,
      "stars": 0
    },
    "exercise": { "id": "8888...", "index": 2, "total": 4, "type": "fill_blank", "prompt": "..." },
    "finished": false,
    "result": null
  },
  "error": null
}
```

Cuando la partida termina (`finished: true`), `exercise` es `null` y llega `result`:

```json
{
  "finished": true,
  "result": {
    "outcome": "won",
    "score": 88,
    "stars": 2,
    "xp_awarded": 50,
    "coins_awarded": 10,
    "leveled_up": true,
    "character_level": 4,
    "character_xp": 390,
    "character_coins": 95,
    "unlocked_level_id": "3333-el-siguiente",
    "achievements": [
      { "slug": "first-blood", "name": "Primer Golpe", "xp_reward": 20, "coins_reward": 10 }
    ]
  }
}
```

Derrota:

```json
{ "finished": true, "result": { "outcome": "lost", "score": 40, "stars": 0, "xp_awarded": 0, "coins_awarded": 0, "achievements": [] } }
```

Con `outcome: "lost"` el jugador repite el nivel: el progreso del nivel no se pierde, solo
esa partida. Con `leveled_up: true`, dispara la animación de subida de nivel. Con
`unlocked_level_id`, refresca el mapa para mostrar el candado abierto.

**Errores**: `409 SESSION_ALREADY_FINISHED`, `409 NO_CURRENT_EXERCISE`, `422 VALIDATION_ERROR`,
`429 AI_RATE_LIMITED`.

---

### `POST /sessions/{id}/hint`

Pistas escalonadas: la 1 orienta, la 2 nombra la técnica, la 3 deja la respuesta casi
servida. Cada una recorta el puntaje de ese ejercicio.

**200**

```json
{ "hint": "Piensa en cuál de las tres se traduce como constante.", "hint_level": 1, "hints_remaining": 2, "score_multiplier": 0.85 }
```

Multiplicadores: sin pistas `1.0` · 1 pista `0.85` · 2 pistas `0.65` · 3 pistas `0.4`.
Enséñalo en la interfaz antes de que el jugador pulse: que sepa lo que le cuesta.

**Errores**: `409 NO_MORE_HINTS`, `409 SESSION_ALREADY_FINISHED`.

---

### `POST /sessions/{id}/skip`

Salta el ejercicio consumiendo una **Ficha de Salto** del inventario. No hace daño al
jugador, pero ese ejercicio puntúa 0.

**200**: `{ "skipped": true, "session": { }, "exercise": { }, "finished": false, "result": null }`
**Errores**: `409 ITEM_NOT_OWNED`, `409 SESSION_ALREADY_FINISHED`.

---

### `POST /sessions/{id}/abandon`

Cierra la partida sin recompensa. **200**: el objeto `session` con `status: "abandoned"`.

---

### `POST /attempts/{id}/explain`

**Esta es la función que hace que la app enseñe, no solo evalúe.** Dado un intento fallido,
la IA explica paso a paso **el error concreto** que cometió ese jugador, no la solución
genérica.

Se cachea en el intento: pedirla dos veces no cuesta dos llamadas al modelo.

**200**

```json
{
  "success": true,
  "data": {
    "attempt_id": "7777...",
    "explanation_md": "### Qué pasó\n\nCreíste que const permitía reasignar...\n\n### Paso a paso\n\n**1. Qué hace const**\n\nconst fija la vinculación...\n\n### La solución\n\nUsa let cuando el valor va a cambiar.\n\n### Para la próxima\n\nElige la declaración según si el valor cambia.\n\n> Casi. Ese error lo comete todo el mundo una vez.",
    "structured": {
      "diagnostico": "Creíste que const permitía reasignar el valor.",
      "pasos": [{ "titulo": "Qué hace const", "detalle": "..." }],
      "solucion": "Usa let cuando el valor va a cambiar.",
      "regla_general": "Elige la declaración según si el valor cambia o no.",
      "animo": "Casi. Ese error lo comete todo el mundo una vez."
    },
    "cached": false
  },
  "error": null
}
```

Pinta `explanation_md` como Markdown, o arma tu propia pantalla con `structured` (útil para
mostrar los pasos uno a uno, estilo diálogo). `animo` va siempre al final: nunca humilla al
jugador, y tu interfaz tampoco debería.

**Errores**: `404 NOT_FOUND`, `409 ATTEMPT_WAS_CORRECT`, `502 AI_GENERATION_FAILED`.

---

## 6. Economía

### `GET /items`

**200**: array de ítems.

```json
[
  {
    "id": "aaaa...",
    "slug": "potion-small",
    "name": "Poción Pequeña",
    "description": "Recupera 30 HP en combate.",
    "category": "potion",
    "price_coins": 25,
    "effect": { "type": "heal", "amount": 30 },
    "sprite_key": "item_potion_s",
    "sprite_url": "https://.../item_potion_s.png",
    "min_character_level": 1
  }
]
```

Categorías: `potion` · `hint` · `skip` · `streak_freeze` · `cosmetic`.

### `GET /inventory`

**200**: `[{ "inventory_id": "bbbb...", "quantity": 2, "item": { } }]`

### `POST /shop/purchase`

```json
{ "item_id": "aaaa...", "quantity": 1 }
```

**201**: `{ "quantity_owned": 3, "coins_spent": 25, "coins_remaining": 60 }`
La compra es atómica en la base de datos: o se descuentan las monedas y se suma el objeto,
o no pasa nada.
**Errores**: `409 INSUFFICIENT_COINS`, `409 CHARACTER_LEVEL_TOO_LOW`, `404 NOT_FOUND`.

### `POST /inventory/{inventory_id}/use`

```json
{ "session_id": "5555..." }
```

`session_id` es obligatorio para las pociones (curan dentro del combate) y se omite para el
resto.

**200 (poción)**: `{ "effect": "heal", "healed": 30, "hp": { "current": 90, "max": 120 }, "quantity_remaining": 1 }`
**Errores**: `409 ITEM_NOT_OWNED`, `409 SESSION_REQUIRED`, `409 ITEM_NOT_USABLE_HERE`.

---

## 7. Logros, racha y ranking

### `GET /achievements`

**200**

```json
[
  {
    "slug": "first-blood",
    "name": "Primer Golpe",
    "description": "Completa tu primer nivel.",
    "sprite_url": "https://.../ach_first.png",
    "threshold": 1,
    "progress": 1,
    "unlocked": true,
    "unlocked_at": "2026-09-02T18:20:00.000Z",
    "xp_reward": 20,
    "coins_reward": 10
  }
]
```

Los logros secretos solo aparecen una vez desbloqueados.

### `GET /streak`

**200**: `{ "current_days": 3, "longest_days": 7, "last_activity_date": "2026-09-06", "claimed_today": false, "freezes_available": 1 }`

### `POST /streak/claim`

Recompensa diaria: 10 monedas por día de racha, máximo 100.

**200**: `{ "current_days": 4, "coins_awarded": 40, "claimed_date": "2026-09-06" }`
**Errores**: `409 STREAK_ALREADY_CLAIMED`.

> La racha también se actualiza sola al completar un nivel; `claim` solo entrega el premio.

### `GET /leaderboard?scope=global|friends&period=week|all&limit=50`

**200**

```json
{
  "scope": "global",
  "period": "week",
  "entries": [
    {
      "rank": 1,
      "user_id": "3f2b...",
      "username": "frisk_dev",
      "character_name": "Frisk",
      "level": 7,
      "xp": 1240,
      "sprite_url": "https://.../hero_coder.png",
      "is_me": false
    }
  ],
  "me": { "rank": 12, "xp": 340, "is_me": true }
}
```

`me` es `null` si el usuario no está en el top devuelto.

---

## 8. Sprites y assets

### `GET /assets/manifest` (pública)

```json
{
  "version": 3,
  "public": true,
  "expires_in": null,
  "bucket": "assets",
  "assets": {
    "hero_coder": { "path": "sprites/hero_coder.png", "w": 32, "h": 32, "url": "https://.../hero_coder.png" },
    "enemy_slime": { "path": "sprites/enemy_slime.png", "w": 48, "h": 48, "url": "https://.../enemy_slime.png" }
  }
}
```

**Estrategia recomendada en Android**: guarda `version` en `SharedPreferences`. Al arrancar,
pide el manifiesto; si `version` cambió, descarga y reemplaza los sprites en caché. Si no,
usa los locales y no bajes nada.

Con un bucket privado (`public: false`), las `url` son firmadas y caducan a los
`expires_in` segundos: no las persistas, pide el manifiesto de nuevo.

---

## 9. Flujo completo de ejemplo

Desde el login hasta completar un nivel.

**1. Login (contra Supabase, no contra este backend)**

```kotlin
supabase.gotrue.loginWith(Email) { email = "..."; password = "..." }
val token = supabase.gotrue.currentAccessTokenOrNull()!!
```

**2. Cargar el estado del jugador**

```http
GET /api/v1/me
Authorization: Bearer <token>
```

Si `data.character` es `null`, pasa al paso 3. Si no, salta al 4.

**3. Crear el personaje** (solo la primera vez)

```http
POST /api/v1/characters
{ "name": "Frisk", "class": "coder" }
```

→ `201`. Esto desbloquea el primer nivel.

**4. Pintar el mapa**

```http
GET /api/v1/map
```

→ Toma el primer nivel con `status: "unlocked"`.

**5. Leer la lección**

```http
GET /api/v1/levels/3333.../lesson
```

→ Pinta `content_md` y los `worked_examples`. La primera vez tarda: muestra un loader.

**6. Iniciar el combate**

```http
POST /api/v1/levels/3333.../sessions
```

→ `201` con `session.id`, HP del jugador, HP del enemigo y el primer ejercicio.
Guarda `session.id` en memoria **y en disco**: si la app se cierra, lo recuperas con
`GET /sessions/{id}`.

**7. (Opcional) Pedir una pista**

```http
POST /api/v1/sessions/5555.../hint
```

→ `hint_level: 1`, `score_multiplier: 0.85`. Avísale al jugador del costo.

**8. Responder**

```kotlin
val attemptId = UUID.randomUUID().toString()  // genera uno por ejercicio
```

```http
POST /api/v1/sessions/5555.../answer
{ "client_attempt_id": "<attemptId>", "answer": "b", "time_spent_ms": 4200 }
```

→ Anima el golpe con `damage_dealt` / `damage_taken`, actualiza las barras de HP con
`session.hp` y `session.enemy_hp`, y muestra `feedback` en la caja de diálogo.

Si la petición falla por red, **reintenta con el mismo `client_attempt_id`**: no contará
como un segundo intento.

**9. Si falló, ofrecer la explicación**

Cuando `correct: false` y `can_explain: true`:

```http
POST /api/v1/attempts/7777.../explain
```

→ Pinta `explanation_md`. Esto es lo que convierte un fallo en aprendizaje: no lo escondas
detrás de un botón secundario.

**10. Repetir el paso 8** con `exercise` hasta que `finished: true`.

**11. Pantalla de resultado**

Con `result.outcome === "won"`: estrellas (`result.stars`), XP (`result.xp_awarded`),
monedas, `leveled_up` y los `achievements` desbloqueados.
Con `"lost"`: pantalla de derrota con la narrativa `defeat` del nivel y un botón de
reintentar. Nunca un mensaje que culpe al jugador.

**12. Volver al mapa**

```http
GET /api/v1/map
```

→ El nivel completado aparece con sus estrellas y `result.unlocked_level_id` ya está
`unlocked`.

---

## 10. Recomendaciones para el cliente Android

- **Timeouts**: los endpoints con IA (lección, respuesta de `code`/`open`, explicación)
  pueden tardar hasta 45 s. Configura OkHttp con `readTimeout(60, SECONDS)` para esas
  llamadas; el resto puede quedarse en 15 s.
- **Reintentos**: reintenta solo `GET`s y los `POST /answer` que lleven
  `client_attempt_id` (son idempotentes). Nunca reintentes `POST /shop/purchase` a ciegas.
- **Sin caché de ejercicios**: no guardes ejercicios en local intentando adivinar la
  respuesta correcta; no viene en la respuesta y la validación es del servidor.
- **Modo avión**: guarda `session_id` para poder reanudar. Si el jugador responde sin red,
  encola el intento con su `client_attempt_id` y reenvíalo al recuperar conexión.
- **CORS no te afecta**: es cosa del cliente web.
- **Textos**: `narrative` y los mensajes de la IA vienen ya cortos y en español, listos para
  la caja de diálogo. No los recortes con `ellipsize`.
