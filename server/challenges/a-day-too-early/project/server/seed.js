export async function seed({ Assignment }) {
  if (await Assignment.countDocuments()) return;
  await Assignment.insertMany([
    { slug: 'network-review', title: 'Network review', dueDate: '2028-03-12', course: 'Systems Lab' },
    { slug: 'project-checkpoint', title: 'Project checkpoint', dueDate: '2028-02-29', course: 'Systems Lab' },
  ]);
}
