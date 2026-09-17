import { User } from "../models/User.js";

export async function getDashboard(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    return res.json({ message: "Welcome back", userId: user.id });
  } catch (error) {
    return next(error);
  }
}
