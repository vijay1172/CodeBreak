export async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `Request failed with status ${response.status}`);
  }
  return body;
}
