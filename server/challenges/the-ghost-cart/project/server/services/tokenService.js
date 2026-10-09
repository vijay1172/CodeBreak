import jwt from 'jsonwebtoken';
export const jwtSecret = 'brokenrepo-practice-secret-2209';
export function issueToken(payload) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '2h' });
}
export function verifyToken(token) {
  return jwt.verify(token, jwtSecret);
}