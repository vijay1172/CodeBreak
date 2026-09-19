export function contactRepository({ Contact, ImportBatch }) {
  return {
    list: () => Contact.find().sort({ name: 1 }).lean(),
    batches: () => ImportBatch.find().sort({ createdAt: -1 }).limit(10).lean(),
    async import(records, filename) {
      const result = await Contact.bulkWrite(records.map(record => ({
        updateOne: { filter: { email: record.email }, update: { $set: record }, upsert: true },
      })));
      return ImportBatch.create({ filename, rows: records.length, created: result.upsertedCount, updated: result.matchedCount });
    },
  };
}
