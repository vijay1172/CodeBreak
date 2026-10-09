export function userController(User) {
  return {
    async profile(req, res) {
      const user = await User.findById(req.params.id).lean();
      if (!user) return res.status(404).json({ error: 'No such account.' });
      res.json(user);
    },
  };
}