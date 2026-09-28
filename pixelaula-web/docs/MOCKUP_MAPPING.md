# Correspondencia de mockups → rutas web

Esta implementación tomó como referencia las pantallas principales del PDF y los PNG organizados del paquete de recursos.

| Mockup | Ruta implementada | Estado |
|---|---|---|
| Landing / portada web | `/` | Funcional y responsive |
| Panel del estudiante | `/app` | Funcional |
| Catálogo de materias | `/app/materias` | Buscador y filtros demo |
| Mapa de aprendizaje | `/app/niveles` | Visual + navegación |
| Misión Física Eléctrica | `/app/misiones/fisica/circuitos` | Interacción demo completa |
| Logros e insignias | `/app/logros` | Funcional con datos demo |
| Personalización de avatar | `/app/avatar` | Selección y preview demo |
| Perfil del estudiante | `/app/perfil` | Funcional |
| Ranking y comunidad | `/app/comunidad` | Funcional con ranking demo |
| Lección completada | `/app/resultados/leccion` | Flujo desde la misión |

## Criterio de réplica

El objetivo no es meter las capturas como una imagen plana. Cada pantalla fue reconstruida en componentes React para que:

- pueda consumir información real;
- tenga estados e interacción;
- funcione en escritorio, tablet y móvil;
- pueda evolucionar sin rehacer el diseño;
- conserve la paleta, bordes neón, paneles oscuros, tipografía pixel y jerarquía visual de PixelAula.
