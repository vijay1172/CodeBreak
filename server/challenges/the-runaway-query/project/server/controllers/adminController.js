export function adminController(User) {
  return {
    async directory(req, res) {
      const users = await User.find({ role: 'member' }).sort({ name: 1 }).lean();
      res.json({ users });
    },
  };
}