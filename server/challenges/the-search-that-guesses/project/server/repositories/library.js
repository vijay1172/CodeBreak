export function libraryRepository({ LibraryEntry }) {
  return {
    async search(text) {
      const filter = { archived: false };
      if (text) filter.name = new RegExp(text, 'i');
      return LibraryEntry.find(filter).sort({ name: 1, code: 1 }).limit(50).lean();
    },
  };
}
