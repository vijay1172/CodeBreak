import { Router } from "express";

const users = new Map([["user-1", { id: "user-1", fullName: "Priya Sharma" }]]);

export function findUser(id) {
  const user = users.get(id);
  return user ? { id: user.id, fullName: user.fullName } : null;
}

export function createUserRouter() {
  const router = Router();
  router.get("/:id", (req, res) => {
    const user = findUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  });
  return router;
}
