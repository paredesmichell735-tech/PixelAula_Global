# Pasos de trabajo recomendados

## Paso 1 — Ejecutar el starter

Haz `npm install` y `npm run dev`. Revisa todas las rutas en escritorio y móvil.

## Paso 2 — Congelar el sistema visual

Antes de integrar API, acuerda tamaños de botones, bordes, tipografías, colores y breakpoints. Así no mezclas problemas visuales con problemas de backend.

## Paso 3 — Crear una capa de servicios

No llames `fetch()` directamente desde cada componente. Crea servicios separados por dominio: auth, users, subjects, missions, achievements, avatar y community.

## Paso 4 — Conectar login y sesión

Primero valida que la web pueda iniciar sesión, mantener la sesión y recuperar al usuario al refrescar.

## Paso 5 — Conectar Dashboard

Es la mejor pantalla para probar el backend porque resume usuario, materias, misiones, actividad y logros.

## Paso 6 — Conectar Materias y Mapa

Cuando Dashboard ya carga datos, conecta el catálogo y el árbol/mapa de niveles.

## Paso 7 — Conectar la ejecución de misiones

Separa:

- definición de la misión;
- estado del intento;
- respuestas del usuario;
- validación;
- resultado;
- recompensas.

## Paso 8 — Conectar gamificación

XP, nivel, rachas, insignias y ranking deben calcularse o validarse en backend.

## Paso 9 — Avatar y comunidad

Conecta personalización, inventario, amigos, ranking y actividad social.

## Paso 10 — QA responsive

Prueba como mínimo:

- 1440×900;
- 1366×768;
- 1024×768;
- 768×1024;
- 390×844.

## Paso 11 — Seguridad

- cookies seguras o JWT correctamente expirado;
- CORS limitado;
- rate limiting en autenticación;
- validación del backend para XP/recompensas;
- no confiar en resultados enviados por el frontend.

## Paso 12 — Producción

Compila con `npm run build`, configura variables de entorno reales y despliega web y backend por separado o detrás del mismo reverse proxy.
