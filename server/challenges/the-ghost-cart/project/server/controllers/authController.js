import { issueToken } from '../services/tokenService.js';
import { cachedUser, rememberUser } from '../services/userCache.js';
export function authController(User) {
  return {
    async login(req, res) {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const user = cachedUser(email) || (await User.findOne({ email }).lean());
      if (!user) return res.status(404).json({ error: 'No account for that email.' });
      rememberUser(user);
      const token = issueToken({ email: user.email, plan: user.plan });
      res.json({ token });
    },
  };
}