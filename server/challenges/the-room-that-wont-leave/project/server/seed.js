export async function seed({ Member }) {
  if (await Member.countDocuments()) return;
  await Member.insertMany([{ handle: 'maya', name: 'Maya', status: 'online' }, { handle: 'leo', name: 'Leo', status: 'away' }]);
}
