import { Router } from 'express';
import { libraryRepository } from '../repositories/library.js';
import { libraryController } from '../controllers/library.js';
export function domainRouter(models) {
  const router = Router();
  router.get('/library/search', libraryController(libraryRepository(models)));
  return router;
}
