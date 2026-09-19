export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function errorHandler(error, req, res, _next) {
  void _next;
  const status = error.status || (error.name === 'ValidationError' ? 422 : 500);
  if (status >= 500) console.error(req.requestId, error.message);
  res.status(status).json({ error: status >= 500 ? 'The service could not complete this request.' : error.message, requestId: req.requestId });
}
