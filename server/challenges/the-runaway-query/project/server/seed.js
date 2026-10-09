export async function seed({ User }) {
  if (await User.countDocuments()) return;
  const members = Array.from({ length: 200 }, (_unused, index) => ({
    name: 'user-' + String(index + 1).padStart(3, '0'),
    email: 'user-' + String(index + 1).padStart(3, '0') + '@example.com',
    role: 'member',
  }));
  await User.insertMany(members);
}