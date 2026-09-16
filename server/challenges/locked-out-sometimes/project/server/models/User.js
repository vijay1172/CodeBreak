const users = new Map([["student-42", { id: "student-42", name: "Maya Rao" }]]);

export const User = {
  async findById(id) {
    const user = users.get(id);
    if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
    return { ...user };
  },
};
