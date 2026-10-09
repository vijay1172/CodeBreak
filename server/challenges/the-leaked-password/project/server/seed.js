export async function seed({ User }) {
  if (await User.countDocuments()) return;
  await User.insertMany([
    { _id: 'student-id', email: 'student@example.com', name: 'Sam Student', passwordHash: 'sha256:91d2f0aa', isAdmin: false },
    { _id: 'admin-id', email: 'admin@example.com', name: 'Riya Admin', passwordHash: 'sha256:77ba91cc', isAdmin: true },
  ]);
}