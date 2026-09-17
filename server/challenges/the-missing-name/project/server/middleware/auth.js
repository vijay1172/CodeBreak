import { verifyAccessToken } from "../services/tokenService.js";

export function auth(req, res, next) {
  const value = req.headers.authorization;

  if (!value?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = verifyAccessToken(value.slice(7));
  if (!user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  req.user = user;
  next();
}
