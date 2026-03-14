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
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/confusion', confusionRouter);
app.use('/api/intervene', interveneRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/privacy', (_req, res) => res.send('<h2>ConfuSense Privacy Policy</h2><p>Webcam frames are sent to a secure backend and analyzed using Google Gemini for engagement detection. Frames are processed in real time and are not stored permanently. No raw video is retained after scoring.</p>'));
app.get('/support', (_req, res) => res.send('<h2>ConfuSense Support</h2><p>For issues, contact the ConfuSense team at IIT.</p>'));

async function main(): Promise<void> {
  await runMigrations();
  console.log('[DB] Migrations complete');

  await connectNats();
  await startConsumer();
  console.log('[Consumer] Frame processor started');

  app.listen(config.PORT, () => {
    console.log(`[Server] Listening on :${config.PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
