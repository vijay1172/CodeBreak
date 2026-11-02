export function errorHandler(error, _req, res, _next) {
  void _next;
  if (res.headersSent) return res.end();
  console.error('Request failed:', error?.message || 'Unknown error');
  return res.status(500).json({ error: 'The request could not be completed.' });
}
