export async function seed({ User }) {
  if (await User.countDocuments()) return;
  await User.create({ email: 'maya@example.com', plan: 'free' });
}