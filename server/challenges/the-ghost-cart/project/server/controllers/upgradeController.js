export function upgradeController(User) {
  return {
    async upgrade(req, res) {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const updated = await User.findOneAndUpdate({ email }, { plan: 'premium' }, { new: true }).lean();
      if (!updated) return res.status(404).json({ error: 'No account for that email.' });
      res.json({ email: updated.email, plan: updated.plan });
    },
  };
}