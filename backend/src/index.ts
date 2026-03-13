import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { runMigrations } from './db/schema.js';
import { connectNats } from './queue/publisher.js';
import { startConsumer } from './queue/consumer.js';
import { sessionsRouter } from './api/routes/sessions.js';
import { framesRouter } from './api/routes/frames.js';
import { notificationsRouter } from './api/routes/notifications.js';
import { dashboardRouter } from './api/routes/dashboard.js';
import { confusionRouter } from './api/routes/confusion.js';
import { interveneRouter } from './api/routes/intervene.js';
import { analyticsRouter } from './api/routes/analytics.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  if (req.path !== '/health') console.log(`[API] ${req.method} ${req.path}`);
  next();
});

app.use('/api/sessions', sessionsRouter);
app.use('/api/frames', framesRouter);
