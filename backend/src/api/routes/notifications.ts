import { Router } from 'express';
import { getAndMarkNotificationsRead } from '../../db/queries.js';

export const notificationsRouter = Router();

notificationsRouter.get('/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const role = req.query.role as 'student' | 'host' | undefined;
  const notifications = await getAndMarkNotificationsRead(uuid, role);
  if (notifications.length > 0) {
    const types = notifications.map(n => n.type).join(', ');
    console.log(`[Notify] ${uuid.slice(0, 8)}… (${role ?? 'any'}) polled → ${notifications.length} notification(s): ${types}`);
  }
  res.json({ notifications });
});
