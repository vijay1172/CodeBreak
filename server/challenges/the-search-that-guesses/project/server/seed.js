export async function seed({ LibraryEntry }) {
  if (await LibraryEntry.countDocuments()) return;
  await LibraryEntry.insertMany([
    { code: 'node-dot', name: 'Node.js Handbook', section: 'backend' },
    { code: 'node-near', name: 'NodeXjs Handbook', section: 'backend' },
    { code: 'cpp', name: 'C++ Essentials', section: 'backend' },
    { code: 'cpp-primer', name: 'C++ Primer', section: 'backend' },
    { code: 'c-minus', name: 'C-- Notes', section: 'backend' },
    { code: 'draft', name: '[draft] Release Guide', section: 'operations' },
    { code: 'sum', name: 'A+B Build System', section: 'operations' },
    { code: 'js-one', name: 'JavaScript Patterns', section: 'frontend' },
    { code: 'js-two', name: 'Modern JavaScript', section: 'frontend' },
    { code: 'old', name: 'Archived JavaScript', section: 'frontend', archived: true },
  ]);
}
