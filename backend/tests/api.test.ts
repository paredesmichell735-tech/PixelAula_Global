import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

let app: Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

describe('envelope y salud', () => {
  it('GET /api/v1/health responde con el envelope de éxito', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, error: null });
    expect(res.body.data.status).toBe('ok');
  });

  it('una ruta inexistente devuelve el envelope de error', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('una ruta inexistente bajo /api/v1 responde 401, no 404: no revela qué rutas existen', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(401);
  });
});

describe('autenticación', () => {
  const protectedRoutes: [string, string][] = [
    ['get', '/api/v1/me'],
    ['get', '/api/v1/map'],
    ['get', '/api/v1/me/inventory'],
    ['post', '/api/v1/streak/claim'],
  ];

  it.each(protectedRoutes)('%s %s exige token', async (method, path) => {
    const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[method]!(path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza un esquema de autorización que no sea Bearer', async () => {
    const res = await request(app).get('/api/v1/me').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });
});

describe('catálogo de endpoints', () => {
  it('expone los endpoints del contrato compartido', async () => {
    const res = await request(app).get('/api/endpoints');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(70);
    const paths = res.body.endpoints.map((e: { path: string }) => e.path);
    expect(paths).toContain('/attempts/:id/answer');
    expect(paths).toContain('/me/dashboard');
  });
});
