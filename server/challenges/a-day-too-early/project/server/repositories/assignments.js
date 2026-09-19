export function assignmentRepository({ Assignment }) {
  return {
    list: () => Assignment.find().sort({ dueDate: 1, slug: 1 }).lean(),
    find: slug => Assignment.findOne({ slug }).lean(),
    save: data => Assignment.findOneAndUpdate({ slug: data.slug }, data, { upsert: true, new: true, runValidators: true }).lean(),
  };
}
