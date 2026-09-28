import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const backendUrl = process.env.BACKEND_URL?.trim();

app.use(cors({ origin: true, credentials: true }));
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pixelaula-web-adapter', backendConfigured: Boolean(backendUrl) });
});

if (backendUrl) {
  app.use('/api', createProxyMiddleware({
    target: backendUrl,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/api': '' }
  }));
} else {
  app.use('/api', (_req, res) => {
    res.status(503).json({
      message: 'BACKEND_URL no está configurada. Usa VITE_USE_MOCKS=true o configura server/.env.'
    });
  });
}

app.listen(port, () => {
  console.log(`PixelAula adapter listo en http://localhost:${port}`);
});
