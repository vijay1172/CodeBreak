// Public, crawler-facing challenge content. Mirrors the orchestrator's
// definitions (server/src) minus anything sandbox-specific — safe to embed
// in statically rendered pages. Update both when adding a challenge.

export type CatalogEntry = {
  id: string;
  title: string;
  category: string;
  shortTag: string;
  difficulty: "beginner" | "intermediate";
  symptom: string;
  criteria: string[];
};

export const challengeCatalog: CatalogEntry[] = [
  {
    id: "the-missing-name",
    title: "The Missing Name",
    category: "API contract bug",
    shortTag: "API contracts",
    difficulty: "beginner",
    symptom: "The profile endpoint returns a user, but the student's name is blank in the React UI.",
    criteria: [
      "returns the requested user from the API",
      "shows the user's name from the live API response",
      "returns 404 for an unknown user",
    ],
  },
  {
    id: "the-ghost-update",
    title: "The Ghost Update",
    category: "Async / race condition",
    shortTag: "race conditions",
    difficulty: "intermediate",
    symptom: "Fast typing sometimes replaces fresh search results with results from an older request.",
    criteria: [
      "shows results for a single completed search",
      "keeps results for the most recent query",
      "rejects when the search service fails",
    ],
  },
  {
    id: "the-silent-field",
    title: "The Silent Field",
    category: "Database / schema bug",
    shortTag: "database schema",
    difficulty: "beginner",
    symptom: "Task due dates are stored, but they disappear when the task list is serialized for the client.",
    criteria: [
      "stores the supplied due date on a new task",
      "returns the stored due date in the task-list response",
      "uses null when a task has no due date",
    ],
  },
  {
    id: "locked-out-sometimes",
    title: "Locked Out, Sometimes",
    category: "Auth / middleware bug",
    shortTag: "auth middleware",
    difficulty: "intermediate",
    symptom: "Some logged-in users can open the dashboard, while others receive a 401 even though their token is valid.",
    criteria: [
      "rejects requests without a token",
      "client and middleware agree on the authentication header",
      "accepts a valid bearer token and forwards the request",
    ],
  },
  {
    id: "the-stubborn-counter",
    title: "The Stubborn Counter",
    category: "Frontend state bug",
    shortTag: "React state",
    difficulty: "beginner",
    symptom: "Rapid clicks are batched, but the like counter increases only once instead of once per click.",
    criteria: [
      "increments once for one click",
      "counts every rapid click in one render batch",
      "does not mutate the captured count value",
    ],
  },
  {
    id: "works-on-my-machine",
    title: "Works On My Machine",
    category: "Environment / configuration bug",
    shortTag: "environment config",
    difficulty: "intermediate",
    symptom: "The dashboard works locally but production still sends API requests to localhost.",
    criteria: [
      "builds the dashboard endpoint correctly",
      "uses the deployment API URL supplied by the environment",
      "removes a trailing slash before appending a route",
    ],
  },
  {
    id: "the-vanishing-last-item",
    title: "The Vanishing Last Item",
    category: "Pagination / off-by-one bug",
    shortTag: "pagination",
    difficulty: "beginner",
    symptom: "Each full products page is missing its final item even though page boundaries otherwise look correct.",
    criteria: [
      "starts the first page with the first product",
      "returns every item requested for a full page",
      "starts the second page at the correct offset",
    ],
  },
  {
    id: "the-silent-crash",
    title: "The Silent Crash",
    category: "Error handling bug",
    shortTag: "error handling",
    difficulty: "intermediate",
    symptom: "When the orders database fails, the request hangs without reaching Express error handling.",
    criteria: [
      "returns orders when the database succeeds",
      "forwards database errors to Express error middleware",
      "does not send a success response after a database failure",
    ],
  },
  {
    id: "the-penny-gap",
    title: "The Penny Gap",
    category: "Currency / numeric precision",
    shortTag: "currency rounding",
    difficulty: "beginner",
    symptom: "A shop’s invoice preview is occasionally a few cents lower than the prices on its product cards. Increasing the quantity makes the difference grow. Other products total correctly, and the same discrepancy appears in saved invoices.",
    criteria: [
      "quotes whole-dollar products correctly",
      "preserves every cent across fractional prices and quantities",
      "stores the invoice amount returned to the customer",
      "rejects invalid quantities without creating invoices",
      "returns a clear error for an unavailable product",
    ],
  },
  {
    id: "a-day-too-early",
    title: "A Day Too Early",
    category: "Date-only / timezone semantics",
    shortTag: "timezone dates",
    difficulty: "intermediate",
    symptom: "A student schedules an assignment for March 12, but classmates in some locations see March 11 on the course calendar. The edit form still shows the date the student chose, and not everyone can reproduce the problem.",
    criteria: [
      "stores the chosen calendar date without changing it",
      "shows the same calendar day for viewers in different timezones",
      "lists assignments in calendar order",
      "rejects impossible calendar dates",
      "returns 404 for an assignment that does not exist",
    ],
  },
  {
    id: "the-split-import",
    title: "The Split Import",
    category: "File import / CSV parsing",
    shortTag: "CSV import",
    difficulty: "intermediate",
    symptom: "The supplier directory imports small spreadsheets correctly, but some larger exports are rejected even though they open normally in a spreadsheet app. Retrying the same file does not help. The team needs every contact and its notes preserved, not skipped.",
    criteria: [
      "imports ordinary contacts and quoted commas",
      "preserves complete records containing multiline quoted notes",
      "updates existing contacts without duplicating them",
      "rejects invalid rows before writing any contacts",
      "rejects an empty upload with a useful message",
    ],
  },
  {
    id: "the-room-that-wont-leave",
    title: "The Room That Won’t Leave",
    category: "Resource lifecycle / listener cleanup",
    shortTag: "event listeners",
    difficulty: "intermediate",
    symptom: "The team room works normally when first opened. After users visit other screens and return a few times, each teammate update produces several notifications. People also receive room notifications after they have left the room.",
    criteria: [
      "loads the member directory from the API",
      "persists a member status change",
      "rejects unsupported presence states",
      "delivers each valid presence event to an active screen",
      "stops delivery after unmount and avoids duplicate subscriptions on return",
    ],
  },
  {
    id: "the-borrowed-language",
    title: "The Borrowed Language",
    category: "Caching / incomplete cache key",
    shortTag: "cache keys",
    difficulty: "intermediate",
    symptom: "Shoppers switch the catalogue from English to French, but some product pages keep the English title and description. A different product may appear in the correct language. The problem also seems to depend on which language was used first after the service restarted.",
    criteria: [
      "returns the requested translation on a cold lookup",
      "reuses cached data for repeated equivalent requests",
      "keeps product translations independent across warmed cache entries",
      "rejects unsupported locales",
      "returns 404 rather than caching a missing product",
    ],
  },
  {
    id: "the-search-that-guesses",
    title: "The Search That Guesses",
    category: "Search / literal query handling",
    shortTag: "literal search",
    difficulty: "intermediate",
    symptom: "The internal library search works for ordinary words, but searching for exact tool names such as “Node.js” returns unrelated titles. Some names containing punctuation do not produce results at all. Users expect the search box to find the text they typed.",
    criteria: [
      "finds ordinary words without case sensitivity",
      "treats punctuation in search text as literal characters",
      "excludes archived library entries",
      "returns a stable default list for an empty query",
      "rejects overlong search input",
    ],
  },
  {
    id: "one-click-two-bookings",
    title: "One Click, Two Bookings",
    category: "Retry semantics / idempotency",
    shortTag: "idempotent retries",
    difficulty: "intermediate",
    symptom: "A workshop booking sometimes appears twice after a brief connection interruption. The attendee clicked once and saw one confirmation. Normal bookings work, and refreshing the bookings list confirms that both entries were saved.",
    criteria: [
      "creates and confirms a normal workshop booking",
      "replays an existing operation without inserting another booking",
      "creates one booking when a committed response is lost and retried",
      "keeps independently submitted bookings distinct",
      "does not retry a rejected booking request",
    ],
  },
];

export function getCatalogEntry(id: string) {
  return challengeCatalog.find((entry) => entry.id === id);
}
