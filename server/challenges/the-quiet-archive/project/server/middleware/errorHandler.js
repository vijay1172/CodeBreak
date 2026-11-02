export function errorHandler(error, _req, res, _next) {
  console.error('Document request failed:', error?.message || 'Unknown error');
  if (!res.headersSent) res.status(500).json({ error: 'Server error.' });
}
