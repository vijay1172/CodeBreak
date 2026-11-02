import { COACH_MAX_MESSAGES, COACH_MESSAGE_BYTES } from "./coach-files.js";

export type CoachTurn = { role: "user" | "coach"; text: string; fileIds?: string[] };
export type CoachMessage = Pick<CoachTurn, "role" | "text">;
export type CoachRequest = { messages: CoachMessage[]; fileIds: string[] };

export function makeCoachRequest(turns: CoachTurn[], fileIds: string[]): CoachRequest {
  // Copy only conversation text and roles, never prior attachment selections or
  // attachment contents. The server authorizes the current selections again.
  const messages = turns.map(({ role, text }) => ({ role, text })).slice(-COACH_MAX_MESSAGES);
  const bytes = (message: CoachMessage) => new TextEncoder().encode(message.text).length;
  while (messages.length > 1 && messages.reduce((total, message) => total + bytes(message), 0) > COACH_MESSAGE_BYTES) messages.shift();
  // History pruning must not start with a reply whose question was removed.
  while (messages[0]?.role === "coach") messages.shift();
  return { messages, fileIds: [...fileIds] };
}
