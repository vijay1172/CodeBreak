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
  {
    "id": "the-invisible-update",
    "title": "The Invisible Update",
    "category": "State management / API sync",
    "shortTag": "Optimistic UI",
    "difficulty": "intermediate",
    "symptom": "A user edits their profile name and hits Save. The page immediately shows the updated name",
    "criteria": [
      "updates the stored name through the current profile endpoint",
      "answers the retired profile path with a 404",
      "sends profile saves to the current endpoint",
      "reverts the shown name when a save fails",
      "rejects blank or oversized profile names"
    ]
  },
  {
    "id": "the-duplicate-order",
    "title": "The Duplicate Order",
    "category": "Request deduplication / idempotency",
    "shortTag": "Idempotency",
    "difficulty": "intermediate",
    "symptom": "Clicking the Place Order button quickly two times in a row creates two identical orders and processes payment twice. A single click always works correctly.",
    "criteria": [
      "creates exactly one order for a single submission",
      "returns the existing order when the same operation key is replayed",
      "keeps two identical rapid submissions to a single order",
      "prices the order from the seeded catalogue",
      "rejects an order without purchasable items"
    ]
  },
  {
    "id": "the-leaked-password",
    "title": "The Leaked Password",
    "category": "Sensitive data exposure",
    "shortTag": "Data exposure",
    "difficulty": "beginner",
    "symptom": "The user profile page loads correctly and shows the right information",
    "criteria": [
      "hides the password hash from the profile response",
      "hides the admin flag from the profile response",
      "still returns the public profile fields",
      "never loads the password hash without an explicit request"
    ]
  },
  {
    "id": "the-frozen-dropdown",
    "title": "The Frozen Dropdown",
    "category": "useEffect dependency array bug",
    "shortTag": "Effect dependencies",
    "difficulty": "beginner",
    "symptom": "The category filter dropdown loads correctly the first time you visit the products page",
    "criteria": [
      "loads the category list for the first shop",
      "reloads categories when the shop changes",
      "resolves the final shop when switches come quickly",
      "serves a distinct catalogue per shop",
      "answers an empty list for a shop without categories"
    ]
  },
  {
    "id": "the-ghost-cart",
    "title": "The Ghost Cart",
    "category": "JWT stale payload",
    "shortTag": "JWT claims",
    "difficulty": "intermediate",
    "symptom": "A user upgrades their account to premium. They log out and log back in. The app still shows them the free tier interface and blocks premium features — even though their account is definitely upgraded in the database.",
    "criteria": [
      "issues a login token carrying the stored plan",
      "reflects an upgrade in the next login token",
      "accepts the upgraded token on premium routes",
      "rejects a pre-upgrade token on premium routes",
      "rejects a login for an unknown account"
    ]
  },
  {
    "id": "the-runaway-query",
    "title": "The Runaway Query",
    "category": "Unbounded database fetch",
    "shortTag": "Pagination",
    "difficulty": "beginner",
    "symptom": "The admin users page works perfectly with a small dataset",
    "criteria": [
      "caps the default directory page at fifty users",
      "serves the requested page at the requested size",
      "includes paging metadata for the table",
      "requires the admin key for the directory",
      "honors a larger request without lifting the cap"
    ]
  },
  {
    "id": "the-confused-timezone",
    "title": "The Confused Timezone",
    "category": "Date handling / timezone bug",
    "shortTag": "UTC storage",
    "difficulty": "intermediate",
    "symptom": "Events show the correct date to the person who created them, but other users in different timezones see the same event listed one day earlier or one day later.",
    "criteria": [
      "stores the chosen day as a UTC timestamp",
      "renders the same calendar day in every timezone",
      "returns the submitted day on read-back",
      "rejects impossible calendar days",
      "lists events in calendar order"
    ]
  },
  {
    "id": "the-missing-notification",
    "title": "The Missing Notification",
    "category": "Promise.all failure mode / swallowed rejection",
    "shortTag": "Promise errors",
    "difficulty": "intermediate",
    "symptom": "When a new order is placed, users should receive a confirmation email and the product inventory should update simultaneously. Sometimes only one happens. Sometimes neither does. The order itself always saves correctly.",
    "criteria": [
      "confirms the order and completes both side effects",
      "fails the request when the inventory update throws",
      "does not confirm the order when the notification fails",
      "decrements stock by the ordered quantity",
      "leaves stock untouched when the inventory update fails"
    ]
  },
  {
    "id": "the-public-secret",
    "title": "The Public Secret",
    "category": "Environment variable exposure",
    "shortTag": "Secret config",
    "difficulty": "beginner",
    "symptom": "The app works correctly in all environments",
    "criteria": [
      "keeps the processor secret out of the browser config",
      "reads the payment secret from the server environment",
      "keeps the database connection string off the client",
      "rejects payment intents outside the allowed range",
      "stops sourcing browser configuration from import.meta.env"
    ]
  },
  {
    "id": "the-slow-search",
    "title": "The Slow Search",
    "category": "Missing index / N+1 query",
    "shortTag": "Indexes and N+1",
    "difficulty": "intermediate",
    "symptom": "The product search works correctly and returns accurate results",
    "criteria": [
      "indexes the product name for search",
      "resolves sellers without one query per result",
      "answers a full catalog search quickly",
      "matches products by name accurately",
      "keeps archived products out of search results"
    ]
  }
];

export function getCatalogEntry(id: string) {
  return challengeCatalog.find((entry) => entry.id === id);
}
