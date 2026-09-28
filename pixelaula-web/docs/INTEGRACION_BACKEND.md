# Integración del backend existente

El frontend empieza con mocks para que puedas revisar el diseño sin depender del backend. Después puedes sustituir cada bloque de forma progresiva.

## 1. Configuración

`web/.env`

```env
VITE_API_URL=/api
VITE_USE_MOCKS=false
```

`server/.env`

```env
PORT=3001
BACKEND_URL=http://localhost:TU_PUERTO
```

## 2. Contrato recomendado

No es obligatorio que tu backend tenga exactamente estas rutas. Son una guía para mapear lo que ya tienes.

### Sesión

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Perfil y progreso

- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/progress`
- `GET /users/me/activity`

### Materias

- `GET /subjects`
- `GET /subjects/:id`
- `GET /subjects/:id/levels`
- `GET /subjects/:id/progress`

### Misiones

- `GET /missions`
- `GET /missions/:id`
- `POST /missions/:id/start`
- `POST /missions/:id/submit`
- `GET /missions/:id/result`

### Logros

- `GET /achievements`
- `GET /users/me/achievements`

### Avatar

- `GET /users/me/avatar`
- `PUT /users/me/avatar`
- `GET /avatar/items`

### Comunidad

- `GET /leaderboard`
- `GET /friends`
- `GET /community/activity`

## 3. Sustitución de mocks

Empieza por `web/src/data/mockData.ts`. No borres todos los mocks al mismo tiempo. Integra pantalla por pantalla.

Patrón sugerido:

```ts
import { apiFetch, USE_MOCKS } from './services/api';
import { subjects as mockSubjects } from './data/mockData';

export async function getSubjects() {
  if (USE_MOCKS) return mockSubjects;
  return apiFetch('/subjects');
}
```

Después llama esa función desde la página y maneja estados de carga/error.

## 4. Autenticación

Si tu backend usa cookies HttpOnly, `apiFetch` ya incluye `credentials: 'include'`.

Si usa JWT en header, agrega una función para recuperar el token y enviar:

```ts
Authorization: `Bearer ${token}`
```

No guardes secretos del backend en variables `VITE_*`; todo lo que empiece por `VITE_` queda visible en el navegador.

## 5. WebSocket

El adaptador de Node tiene `ws: true`. Si el backend usa Socket.IO o una ruta específica, configura el cliente con la URL correspondiente y valida que el proxy conserve `Upgrade`.

## 6. Flujo sugerido para la misión

1. `POST /missions/:id/start` devuelve intento y configuración.
2. El usuario resuelve la misión.
3. El frontend guarda respuestas localmente mientras juega.
4. `POST /missions/:id/submit` envía el intento.
5. Backend calcula XP, estrellas, logros y racha.
6. Frontend navega a `/app/resultados/leccion` con el resultado devuelto.

La lógica de puntuación final debe quedar en backend, no en el navegador.
