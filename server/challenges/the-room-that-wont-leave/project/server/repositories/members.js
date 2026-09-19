export function memberRepository({ Member }) {
  return {
    list: () => Member.find().sort({ name: 1 }).lean(),
    update: (handle, status) => Member.findOneAndUpdate({ handle }, { $set: { status } }, { new: true, runValidators: true }).lean(),
  };
}
