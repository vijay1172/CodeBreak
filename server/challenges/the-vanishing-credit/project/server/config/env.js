export const env = {
  sandbox: process.env.BROKENREPO_SANDBOX === '1',
  mongoUri: process.env.MONGODB_URI,
  port: Number(process.env.PORT) || 3000,
};
