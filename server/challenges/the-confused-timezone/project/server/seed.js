export async function seed({ Event }) {
  if (await Event.countDocuments()) return;
  await Event.insertMany([
    { slug: 'autumn-fair', title: 'Autumn fair', date: '2026-09-20' },
    { slug: 'winter-gala', title: 'Winter gala', date: '2026-12-25' },
  ]);
}