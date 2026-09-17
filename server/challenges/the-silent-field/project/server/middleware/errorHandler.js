export function errorHandler(error, _req, res, _next) {
  void _next;
  const status = Number(error.status || 500);
  res.status(status).json({ message: status === 500 ? "Something went wrong" : error.message });
}
