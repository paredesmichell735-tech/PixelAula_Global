# Endpoints de PixelAula

Generado desde `shared/pixelaula-api/src/endpoints.ts`. No lo edites a mano:
vuelve a ejecutar `node scripts/gen-docs.mjs` en `shared/pixelaula-api`.

Base: `/api/v1` · Envelope: `{ success, data, error }` · Auth: `Authorization: Bearer <jwt de Supabase>`

**76 endpoints.** La columna *Lenta* marca los que pueden llamar al
modelo de IA: los clientes les dan 60 s de timeout y el backend les aplica el
rate limit estricto.


## Sistema

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/health` | Estado del servicio | No |  |
| `GET` | `/assets/manifest` | Manifiesto de sprites con versión | No |  |

## Sesión y perfil

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/auth/session` | Usuario de la sesión actual | Sí |  |
| `POST` | `/auth/profile` | Completar el alta tras el registro | Sí |  |
| `GET` | `/me` | Mi usuario completo | Sí |  |
| `PATCH` | `/me` | Actualizar nombre visible, username o título | Sí |  |
| `GET` | `/me/progress` | Resumen de progreso y actividad semanal | Sí |  |
| `GET` | `/me/activity` | Actividad reciente | Sí |  |
| `GET` | `/me/dashboard` | Todo el panel de inicio en una llamada | Sí |  |

## Notificaciones

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/me/notifications` | Mis notificaciones | Sí |  |
| `POST` | `/me/notifications/:id/read` | Marcar una como leída | Sí |  |
| `POST` | `/me/notifications/read-all` | Marcar todas como leídas | Sí |  |

## Objetivos, certificados y calendario

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/me/goals` | Mis objetivos de aprendizaje | Sí |  |
| `POST` | `/me/goals` | Crear un objetivo | Sí |  |
| `PATCH` | `/me/goals/:id` | Actualizar un objetivo | Sí |  |
| `DELETE` | `/me/goals/:id` | Borrar un objetivo | Sí |  |
| `GET` | `/me/certifications` | Mis certificaciones | Sí |  |
| `GET` | `/me/calendar` | Clases en vivo y próximas fechas | Sí |  |

## Avatar

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/avatar/catalog` | Catálogo de piezas por categoría | Sí |  |
| `GET` | `/me/avatar` | Mi configuración de avatar | Sí |  |
| `PUT` | `/me/avatar` | Guardar la configuración del avatar | Sí |  |
| `GET` | `/me/avatar/styles` | Mis estilos guardados | Sí |  |
| `POST` | `/me/avatar/styles` | Guardar el look actual como estilo | Sí |  |
| `PATCH` | `/me/avatar/styles/:id` | Renombrar un estilo | Sí |  |
| `DELETE` | `/me/avatar/styles/:id` | Borrar un estilo | Sí |  |
| `POST` | `/me/avatar/styles/:id/equip` | Equipar un estilo guardado | Sí |  |
| `POST` | `/me/avatar/random` | Generar un look aleatorio con lo que tengo | Sí |  |

## Materias y mapa

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/subjects` | Catálogo de materias con mi progreso | Sí |  |
| `GET` | `/subjects/:id` | Detalle de una materia | Sí |  |
| `GET` | `/subjects/:id/missions` | Misiones de una materia | Sí |  |
| `GET` | `/map` | Mapa de aprendizaje completo | Sí |  |

## Misiones

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/missions` | Misiones filtrables por materia y estado | Sí |  |
| `GET` | `/missions/:id` | Detalle de misión con objetivos y recompensas | Sí |  |
| `GET` | `/missions/:id/briefing` | Lección previa (la genera la IA si falta) | Sí | Sí |
| `POST` | `/missions/:id/attempts` | Iniciar o reanudar un intento | Sí | Sí |

## Intentos y actividades

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/attempts/:id` | Estado del intento, para reanudar | Sí |  |
| `GET` | `/attempts/:id/current` | Actividad actual, sin la respuesta correcta | Sí |  |
| `POST` | `/attempts/:id/answer` | Enviar respuesta (idempotente) | Sí | Sí |
| `POST` | `/attempts/:id/hint` | Pedir la siguiente pista (cuesta gemas) | Sí |  |
| `POST` | `/attempts/:id/skip` | Saltar la actividad actual | Sí |  |
| `POST` | `/attempts/:id/abandon` | Abandonar el intento | Sí |  |
| `POST` | `/attempts/:id/finish` | Cerrar el intento y calcular resultado | Sí |  |
| `GET` | `/attempts/:id/result` | Pantalla de misión completada | Sí |  |
| `POST` | `/answers/:id/explain` | Explicación paso a paso del fallo | Sí | Sí |

## Logros, insignias y retos

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/achievements` | Logros con mi progreso | Sí |  |
| `GET` | `/badges` | Insignias | Sí |  |
| `GET` | `/challenges` | Retos activos | Sí |  |
| `POST` | `/challenges/:id/join` | Unirse a un reto | Sí |  |
| `GET` | `/community/team-challenges` | Desafíos por equipos | Sí |  |

## Racha

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/streak` | Mi racha | Sí |  |
| `POST` | `/streak/claim` | Reclamar la recompensa diaria | Sí |  |

## Economía

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/shop/items` | Catálogo de la tienda | Sí |  |
| `POST` | `/shop/purchase` | Comprar un objeto | Sí |  |
| `GET` | `/me/inventory` | Mi inventario | Sí |  |
| `POST` | `/me/inventory/:id/equip` | Equipar un objeto | Sí |  |
| `POST` | `/me/inventory/:id/use` | Usar un consumible | Sí |  |

## Comunidad

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/leaderboard` | Ranking por alcance y periodo | Sí |  |
| `GET` | `/friends` | Mis amigos y solicitudes | Sí |  |
| `POST` | `/friends/requests` | Enviar solicitud de amistad | Sí |  |
| `POST` | `/friends/requests/:id/accept` | Aceptar solicitud | Sí |  |
| `POST` | `/friends/requests/:id/reject` | Rechazar solicitud | Sí |  |
| `DELETE` | `/friends/:id` | Eliminar amistad | Sí |  |
| `GET` | `/classes` | Ranking de clases | Sí |  |
| `GET` | `/classes/:id` | Detalle de una clase | Sí |  |
| `POST` | `/classes/join` | Unirse a una clase por código | Sí |  |
| `POST` | `/classes/:id/leave` | Salir de una clase | Sí |  |
| `GET` | `/community/feed` | Actividad de la comunidad | Sí |  |
| `POST` | `/community/feed` | Publicar en la comunidad | Sí |  |
| `POST` | `/community/feed/:id/like` | Dar o quitar me gusta | Sí |  |

## Búsqueda

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `GET` | `/search` | Buscar materias, misiones y logros | Sí |  |

## Administración

| Método | Ruta | Qué hace | Auth | Lenta |
|---|---|---|:--:|:--:|
| `POST` | `/admin/missions/:id/generate` | Regenerar el contenido de una misión | Sí | Sí |
| `POST` | `/admin/subjects` | Crear materia | Sí |  |
| `PATCH` | `/admin/subjects/:id` | Actualizar materia | Sí |  |
| `POST` | `/admin/missions` | Crear misión | Sí |  |
| `PATCH` | `/admin/missions/:id` | Actualizar misión | Sí |  |
| `GET` | `/admin/ai-costs` | Gasto de IA de los últimos 30 días | Sí |  |


## Cómo se consume

Web y app usan el mismo cliente, así que el flujo es idéntico en los dos:

```ts
import { PixelAulaClient } from '@pixelaula/api';

export const api = new PixelAulaClient({
  baseUrl: import.meta.env.VITE_API_URL,       // móvil: process.env.EXPO_PUBLIC_API_URL
  getToken: () => supabase.auth.getSession().then(r => r.data.session?.access_token ?? null),
  onRefresh: () => supabase.auth.refreshSession().then(r => r.data.session?.access_token ?? null),
  onAuthError: () => router.navigate('/login'),
});

const panel = await api.dashboard();
```
