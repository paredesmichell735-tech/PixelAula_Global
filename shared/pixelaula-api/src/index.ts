/**
 * Contrato de la API de PixelAula.
 *
 * La web (Vite + React) y la app (Expo + React Native) importan de aquí.
 * `schemas.ts` queda fuera a propósito: solo lo usa el backend y arrastra Zod.
 */
export * from './types.js';
export * from './requests.js';
export * from './errors.js';
export * from './endpoints.js';
export * from './client.js';
