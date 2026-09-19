export async function seed({ Workshop }) {
  if (await Workshop.countDocuments()) return;
  await Workshop.insertMany([
    { code: 'debugging', title: 'Debugging distributed systems', startsAt: '2028-04-12T10:00:00Z' },
    { code: 'observability', title: 'Practical observability', startsAt: '2028-04-13T10:00:00Z' },
  ]);
}
