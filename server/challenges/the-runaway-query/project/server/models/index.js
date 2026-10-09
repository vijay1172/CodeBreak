import { userSchema } from './User.js';
export function defineModels(connection) {
  return {
    User: connection.model('User', userSchema),
  };
}