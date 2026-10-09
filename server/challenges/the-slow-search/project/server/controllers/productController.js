export function productController(repository) {
  return {
    async search(req, res) {
      const query = String(req.query?.q || '');
      if (query.length > 80) return res.status(422).json({ error: 'Keep searches to 80 characters or fewer.' });
      const products = await repository.search(query);
      res.json({ results: products.map(({ name, code, priceCents, seller }) => ({ name, code, priceCents, seller: seller ? seller.name : null })) });
    },
  };
}