import { RequestError } from '../middleware/errorHandler.js';
export function catalogueController(service) {
  return {
    list: async (_req, res) => res.json({ products: await service.list() }),
    get: async (req, res) => {
      const locale = String(req.query.locale || 'en');
      if (!['en', 'fr', 'es'].includes(locale)) throw new RequestError(422, 'Choose English, French, or Spanish.');
      res.set('Cache-Control', 'no-store');
      res.json(await service.get(req.params.sku, locale));
    },
  };
}
