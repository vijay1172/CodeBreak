const knownTokens = new Map([["valid-token", { id: "student-42" }]]);

export function verifyAccessToken(token) {
  return knownTokens.get(token) || null;
}
