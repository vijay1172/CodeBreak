export async function seed({ User }) {
  if (await User.countDocuments()) return;
  await User.create({ name: 'Maya Rivera', email: 'maya@example.com' });
}