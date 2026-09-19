export const env = {
  port: Number(process.env.PORT || 3000),
  host: '0.0.0.0',
  mongoUri: process.env.MONGODB_URI,
  sandbox: process.env.CODEBREAK_SANDBOX === '1',
};
