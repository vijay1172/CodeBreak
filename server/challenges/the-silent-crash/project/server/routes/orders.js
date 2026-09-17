export function createOrdersHandler(store) {
  return (_req, res, _next) => {
    void _next;
    store.list()
      .then((orders) => res.json({ orders }))
      .catch(() => {});
  };
}
