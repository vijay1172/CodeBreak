export function registrationRepository({ Registration, Workshop }) {
  return {
    workshops: () => Workshop.find({ open: true }).sort({ startsAt: 1 }).lean(),
    workshop: code => Workshop.findOne({ code, open: true }).lean(),
    list: () => Registration.find().sort({ createdAt: -1 }).limit(100).lean(),
    async putOnce(operationKey, data) {
      try {
        return await Registration.findOneAndUpdate(
          { operationKey }, { $setOnInsert: { operationKey, ...data } },
          { upsert: true, new: true, runValidators: true },
        ).lean();
      } catch (error) {
        if (error.code !== 11000) throw error;
        return Registration.findOne({ operationKey }).lean();
      }
    },
  };
}
