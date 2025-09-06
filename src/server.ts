import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createApiRouter, AppDependencies } from './api';
import { healthCheckHandler } from './utils';
import { errorHandler } from './middleware/error-handler.middleware';
import { config } from './config';

export const createApp = (dependencies: AppDependencies): Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin:
        config.environment === 'production'
          ? 'https://www.onemployment.org'
          : true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400,
    })
  );
  app.use(express.json());
  app.get('/health', healthCheckHandler);
  app.get('/version', (req, res) =>
    res.json({ version: '1.0.1', build: new Date().toISOString() })
  );
  app.use('/api/v1', createApiRouter(dependencies));
  app.use(errorHandler);

  return app;
};
