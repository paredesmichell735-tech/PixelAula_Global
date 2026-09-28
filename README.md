# 🎮 PixelAula Global — Plataforma Educativa Gamificada Multi-materia

<p align="center">
  <img src="./pixelaula-web/web/public/assets/logo.png" alt="PixelAula Logo" width="220" />
</p>

<p align="center">
  <b>Aprende jugando con estética Pixel Art, mecánicas RPG y retroalimentación inteligente por IA.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/React_Native-000000?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</p>

---

## 📌 Descripción del Proyecto

**PixelAula** es un ecosistema educativo integral multi-materia (Física, Programación, Redes y más) diseñado para transformar el aprendizaje en una experiencia gamificada basada en videojuegos RPG con estética pixel art.

La plataforma soporta **múltiples clientes** (Web moderna y App Móvil nativa) respaldados por un único backend centralizado, seguro y escalable con integración de Inteligencia Artificial (Anthropic Claude).

---

## 🏗️ Arquitectura del Monorepo

Este repositorio está estructurado como un monorepo modular donde todos los clientes y servicios comparten contratos de datos fuertemente tipados:

```text
PROYECTO-U / PixelAula_Global
├── ⚙️ backend/               -> API REST en Node.js + Express + TypeScript + Supabase
├── 🌐 pixelaula-web/         -> Cliente Web (React 18 + Vite + TypeScript)
├── 📱 PixelAula_android/     -> Cliente Móvil (React Native + Expo Router + TypeScript)
├── 📦 shared/pixelaula-api/  -> SDK cliente y contrato tipado de API compartido (@pixelaula/api)
└── 📄 docs/                  -> Especificaciones de endpoints y guías de integración
```

---

## ✨ Características Principales

- 🎯 **Aprendizaje Gamificado (RPG)**: Progreso por XP, niveles de jugador, vidas/corazones, rachas diarias y batallas/desafíos.
- 🎨 **Personalización de Avatar Pixel Art**: Catálogo de cosméticos, equipamiento, expresiones y estilos guardados.
- 🗺️ **Mapa de Aprendizaje Interactivo**: Módulos organizados por materias con jefes de nivel, misiones y lecciones previas.
- 🤖 **Evaluación e Inteligencia Artificial**: Generación de lecciones, retroalimentación paso a paso y calificación inteligente vía Anthropic Claude (con fallback en modo `mock` sin costo de tokens).
- 🛡️ **Seguridad y Anti-trampas**: Políticas Row Level Security (RLS) en Supabase Postgres para proteger ejercicios y respuestas sensibles en el servidor.
- 🏆 **Comunidad y Logros**: Tabla de clasificación (Leaderboards), retos en equipo, inventario y sistema de amistades.

---

## 🚀 Guía de Arranque Rápido

### 1. Requisitos Previos
- **Node.js**: v20.0.0 o superior
- **npm**: v9.0.0 o superior
- **Cuenta de Supabase** (o instancia local de Docker con Supabase CLI)

### 2. Instalación de Dependencias

Ejecuta en la raíz y en los proyectos correspondientes:

```bash
# 1. Compilar contrato compartido
cd shared/pixelaula-api
npm install
npm run build

# 2. Instalar dependencias del Backend
cd ../../backend
npm install
cp .env.example .env

# 3. Instalar dependencias de la Web
cd ../pixelaula-web
npm install
```

### 3. Ejecución en Desarrollo

#### ⚙️ Iniciar Backend (Puerto 3000):
```bash
cd backend
npm run dev
```
*API activa en:* `http://localhost:3000/api/v1`

#### 🌐 Iniciar Frontend Web (Puerto 5173 / Proxy 3001):
```bash
cd pixelaula-web
npm run dev
```
*Aplicación Web disponible en:* `http://localhost:5173`

#### 📱 Iniciar Aplicación Móvil (Expo):
```bash
cd PixelAula_android
npm install
npm run start
```

---

## 📡 Endpoints e Integración de API

El paquete `@pixelaula/api` proporciona un cliente fuertemente tipado consumible por la web y la app móvil:

```typescript
import { PixelAulaClient } from '@pixelaula/api';

const api = new PixelAulaClient({
  baseUrl: 'http://localhost:3000/api/v1',
  getToken: async () => supabase.auth.getSession().then(r => r.data.session?.access_token ?? null),
});

// Obtener panel de inicio del usuario
const dashboard = await api.dashboard();
```

Para ver la especificación completa de los **76 endpoints** disponibles, revisa el archivo [`docs/ENDPOINTS.md`](./docs/ENDPOINTS.md).

---

## 🛠️ Tecnologías Utilizadas

- **Lenguaje Core**: TypeScript 5
- **Frontend Web**: React 18, Vite, React Router 6, TanStack Query, Lucide Icons, CSS3.
- **Frontend Móvil**: React Native, Expo 57, Expo Router 4, Zustand.
- **Backend**: Node.js, Express, Zod, Pinot HTTP, Helmet, Express Rate Limit.
- **Base de Datos & Auth**: Supabase (PostgreSQL, Row Level Security, Auth JWT, Storage Buckets).
- **Inteligencia Artificial**: `@anthropic-ai/sdk` (Claude 3.5 / Opus) con fallback estricto `mock`.

---

## 📄 Licencia

Este proyecto fue desarrollado para el ecosistema educativo **PixelAula**. Todos los derechos reservados.
