import { paymentConfig } from '../../client/src/config/constants.js';
export function paymentController() {
  return {
    async intent(req, res) {
      const amountCents = Number(req.body?.amountCents);
      if (!Number.isInteger(amountCents) || amountCents < paymentConfig.minAmountCents || amountCents > paymentConfig.maxAmountCents) {
        return res.status(422).json({ error: 'Payment intents must be between 50 and 500000 cents.' });
      }
      const secret = process.env.VITE_STRIPE_SECRET_KEY;
      if (!secret) return res.status(500).json({ error: 'Payment processor is not configured.' });
      res.json({ status: 'requires_payment_method', amountCents, processor: 'stripe' });
    },
  };
}