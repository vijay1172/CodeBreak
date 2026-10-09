import { eventSchema } from './Event.js';
export function defineModels(connection) {
  return {
    Event: connection.model('Event', eventSchema),
  };
}