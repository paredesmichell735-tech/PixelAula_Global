# PixelAula Web — React + TypeScript + Node

Starter funcional de la web de PixelAula construido a partir de los mockups del proyecto. La idea es que el frontend replique el lenguaje visual de los diseños, pero quede listo para conectarse al backend que ya tienes.

## Stack

- React 18 + TypeScript
- Vite
- React Router
- Lucide Icons
- Node.js + Express como adaptador/proxy opcional hacia tu backend existente
- CSS propio basado en la identidad visual PixelAula

## Arranque rápido

1. Instala Node.js 20 o superior.
2. Descomprime este proyecto.
3. En la raíz ejecuta:

```bash
npm install
```

4. Copia las variables de entorno:

```bash
cp web/.env.example web/.env
cp server/.env.example server/.env
```

En Windows PowerShell:

```powershell
Copy-Item web/.env.example web/.env
Copy-Item server/.env.example server/.env
```

5. Para trabajar inicialmente con datos de demostración, deja:

```env
VITE_USE_MOCKS=true
```

6. Ejecuta:

```bash
npm run dev
```

7. Abre `http://localhost:5173`.

## Rutas ya creadas

| Ruta | Pantalla |
|---|---|
| `/` | Landing pública |
| `/login` | Inicio de sesión demo |
| `/app` | Dashboard del estudiante |
| `/app/materias` | Catálogo de materias |
| `/app/niveles` | Mapa de aprendizaje |
| `/app/misiones/fisica/circuitos` | Misión interactiva de circuitos |
| `/app/logros` | Logros e insignias |
| `/app/avatar` | Personalización de avatar |
| `/app/perfil` | Perfil del estudiante |
| `/app/comunidad` | Ranking y comunidad |
| `/app/resultados/leccion` | Lección completada |

## Cómo conectar tu backend real

El proyecto viene con un adaptador Node para que no tengas que mezclar la lógica del backend actual con la web.

En `server/.env`:

```env
PORT=3001
BACKEND_URL=http://localhost:8080
```

La web llama `/api/...` y Vite lo envía al servidor Node. El servidor Node elimina `/api` y reenvía la petición al backend real.

Ejemplo:

```text
Frontend: GET /api/subjects
Adapter:  GET http://localhost:8080/subjects
```

Si tu backend ya tiene CORS bien configurado y quieres llamarlo directo, puedes omitir el adaptador y cambiar `VITE_API_URL` por la URL de tu API.

## Orden recomendado de integración

### Fase 1 — Apariencia y navegación

Ya está incluida en este ZIP. Recorre las pantallas y ajusta únicamente detalles de espaciado, textos o responsive que quieras modificar.

### Fase 2 — Autenticación

Conecta `/login` con tu endpoint real. Guarda el token/cookie según la estrategia que ya usa tu backend y reemplaza el acceso demo.

### Fase 3 — Usuario y progreso

Integra primero:

- usuario autenticado;
- nivel y XP;
- racha;
- cantidad de logros e insignias;
- actividad reciente.

Esto alimenta Dashboard y Perfil.

### Fase 4 — Materias y mapa

Conecta las materias, sus niveles y el progreso por materia. Después sustituye los arrays demo de `web/src/data/mockData.ts`.

### Fase 5 — Misiones

Conecta la definición de cada misión y el envío de respuestas. La misión de Física ya incluye una interacción demo para probar el flujo completo hasta la pantalla de resultados.

### Fase 6 — Logros, avatar y comunidad

Conecta recompensas, inventario/avatar, ranking, amigos y actividad de comunidad.

### Fase 7 — Realtime y producción

Si tu backend usa WebSockets, el proxy Node ya está preparado con `ws: true`. Después agrega variables de producción y despliegue del frontend.

## Archivos importantes

- `web/src/data/mockData.ts`: todos los datos demo.
- `web/src/services/api.ts`: cliente HTTP base.
- `web/src/styles.css`: sistema visual y responsive.
- `web/src/components/AppShell.tsx`: navegación principal.
- `server/src/index.ts`: proxy Node hacia tu backend.
- `docs/INTEGRACION_BACKEND.md`: contrato recomendado para mapear endpoints.
- `docs/MOCKUP_MAPPING.md`: relación entre mockups y rutas implementadas.
- `docs/reference/`: capturas de referencia comprimidas.

## Compilar

```bash
npm run build
```

La web queda en `web/dist` y el adaptador Node en `server/dist`.
