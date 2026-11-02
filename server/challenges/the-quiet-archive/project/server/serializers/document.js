export function serialize(document) {
  return {
    id: String(document._id),
    title: document.title,
    body: document.body,
    archived: Boolean(document.archivedAt),
    createdAt: document.createdAt.toISOString(),
  };
}
