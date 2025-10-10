import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { createApiRouter } from './api/router.js';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', createApiRouter());

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    void next;
    if (error instanceof ZodError) {
      res.status(400).json({
        message: 'Invalid request payload.',
        issues: error.issues
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.status(500).json({ message });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
  });
}