export function validDraftInput(title, content) {
  return typeof title === 'string' && Boolean(title.trim()) && title.length <= 100
    && typeof content === 'string' && Boolean(content.trim()) && content.length <= 2000;
}

export function validRevisionInput(content, expectedVersion) {
  return typeof content === 'string' && Boolean(content.trim()) && content.length <= 2000
    && Number.isInteger(expectedVersion) && expectedVersion >= 1;
}
