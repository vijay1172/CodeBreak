export function userController(User) {
  return {
    async profile(_req, res) {
      const user = await User.findOne().sort({ createdAt: 1 }).lean();
      if (!user) return res.status(404).json({ error: 'No profile exists yet.' });
      res.json({ id: String(user._id), name: user.name, email: user.email });
    },
    async update(req, res) {
      const name = String(req.body?.name || '').trim();
      if (name.length < 2 || name.length > 80) return res.status(422).json({ error: 'Names are 2 to 80 characters.' });
      const user = await User.findOne().sort({ createdAt: 1 });
      if (!user) return res.status(404).json({ error: 'No profile exists yet.' });
      user.name = name;
      await user.save();
      res.json({ id: String(user._id), name: user.name, email: user.email });
    },
  };
}