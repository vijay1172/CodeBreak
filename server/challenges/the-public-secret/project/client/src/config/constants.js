export const paymentConfig = {
  apiBaseUrl: '/api',
  stripeSecret: import.meta.env?.VITE_STRIPE_SECRET_KEY || 'sk_test_51H8xQmVbBrokenRepoSecret',
  mongoUri: import.meta.env?.VITE_MONGODB_URI || 'mongodb+srv://cluster0.brokenrepo.mongodb.net/shop',
  maxAmountCents: 500000,
  minAmountCents: 50,
};