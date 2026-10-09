export function categoryController(Category, Shop) {
  return {
    async list(_req, res) {
      res.json({ shops: await Shop.find().sort({ shopId: 1 }).lean() });
    },
    async forShop(req, res) {
      const categories = await Category.find({ shopId: req.params.shopId }).sort({ name: 1 }).lean();
      res.json({ categories: categories.map(({ name, kind }) => ({ name, kind })) });
    },
  };
}