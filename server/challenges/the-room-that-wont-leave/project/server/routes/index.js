import { Router } from 'express';
import { memberRepository } from '../repositories/members.js';
import { presenceController } from '../controllers/presence.js';
import { createPresenceHub } from '../services/presenceHub.js';
export function domainRouter(models) {
  const router = Router();
  const controller = presenceController(memberRepository(models), createPresenceHub());
  router.get('/members', controller.list);
  router.patch('/members/:handle/status', controller.update);
  router.get('/presence/events', controller.stream);
  return router;
}
