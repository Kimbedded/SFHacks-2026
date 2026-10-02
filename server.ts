import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './server/apiRouter';
import { startBartTransitSync } from './server/bartTransitService';

dotenv.config();

async function startServer() {
  const app = express();
  startBartTransitSync();
  const PORT = Number(process.env.PORT) || 3000;

  // Body parsers first
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API router
  app.use('/api', apiRouter);

  if (process.env.NODE_ENV === 'production') {
    // Serve static build in production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite middlewares in development
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GatorAccess server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
