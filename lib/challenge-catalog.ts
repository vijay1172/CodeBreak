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
    id: "the-travelling-form", title: "The Travelling Form", category: "Stateful form identity", shortTag: "form state", difficulty: "intermediate",
    symptom: "Expense descriptions can become attached to the wrong rows when a draft report is rearranged before submission.",
    criteria: ["creates a report whose saved rows and total match the submitted form", "keeps each expense intact when rows are reordered", "preserves existing rows when one is removed and a new row is added", "saves edited descriptions and amounts together", "submits the final report and rejects later edits", "rejects invalid rows without changing the saved report", "keeps another demo account from listing, reading, or updating the report", "rejects reads and writes without a valid demo session"],
  },
  {
    id: "the-disappearing-preferences", title: "The Disappearing Preferences", category: "Partial update semantics", shortTag: "partial updates", difficulty: "intermediate",
    symptom: "Saving one career-alert preference can make another choice disappear, and clearing a profile link does not always stick.",
    criteria: ["opens a preference profile with defaults that survive a fresh read", "changes one notification without removing the others", "keeps an earlier false choice through a second partial update", "sets a website without changing notification choices", "clears a website explicitly while keeping existing notification choices", "rejects invalid settings without changing what is saved", "keeps another demo account from reading or modifying preferences", "rejects unauthenticated reads and writes"],
  },
  {
    id: "the-coupon-that-wouldnt-leave", title: "The Coupon That Wouldn't Leave", category: "Derived price state", shortTag: "cart pricing", difficulty: "intermediate",
    symptom: "A shop coupon can remain in the checkout total after the eligible products are removed or changed.",
    criteria: ["creates and reads back a cart with server-calculated totals", "applies a coupon only to eligible products", "removes a discount when the last eligible item leaves the cart", "recalculates the discount when an eligible quantity changes", "removes an applied coupon and checks out at the undiscounted total", "rejects invalid items and coupons without changing the cart", "keeps another demo account from reading or changing the cart", "requires a valid demo session for reads and writes"],
  },
  {
    id: "the-receipt-that-changed", title: "The Receipt That Changed", category: "Historical snapshot integrity", shortTag: "order snapshots", difficulty: "intermediate",
    symptom: "An old order receipt changes when the product catalogue or saved address is edited later.",
    criteria: ["creates and reads a receipt with the checkout-time purchase details", "keeps the original receipt when the catalogue price changes", "keeps the original product name after a catalogue rename", "keeps the original shipping line after the address book changes", "uses current source details for a new order without rewriting an older order", "rejects invalid orders and source edits without modifying a receipt", "keeps another demo account from reading or changing an order", "rejects reads and writes without a valid demo session"],
  },
  {
    id: "the-cart-that-forgot-you", title: "The Cart That Forgot You", category: "Cart reconciliation", shortTag: "cart merge", difficulty: "intermediate",
    symptom: "A guest cart merge can combine different product variants or add the same guest cart twice.",
    criteria: ["creates a guest cart whose claim code and items survive a fresh read", "keeps red and blue variants separate when a guest cart is merged", "combines matching variants without exceeding stock", "leaves a customer cart unchanged when the same guest cart is merged again", "merges an empty guest cart without losing customer items", "rejects invalid variants and claim codes without changing a cart", "keeps another customer from reading or changing an account cart", "rejects cart reads and merges without a valid demo session"],
  },
  {
    id: "the-reset-link-that-still-works", title: "The Reset Link That Still Works", category: "Single-use credential lifecycle", shortTag: "reset links", difficulty: "intermediate",
    symptom: "A password-reset link can still change account state after it was used or replaced.",
    criteria: ["creates a recovery request whose current token survives a fresh read", "redeems a valid link and records a single password change", "rejects a second use of an already redeemed link", "retires an older link when a replacement is issued", "lets the replacement link work exactly once", "rejects a weak password without consuming a valid link", "keeps another account from reading or redeeming a request", "requires a valid demo session to read or redeem a link"],
  },
  {
    id: "the-inbox-that-reads-ahead", title: "The Inbox That Reads Ahead", category: "Bounded state transition", shortTag: "inbox state", difficulty: "intermediate",
    symptom: "Acknowledging an older notification also marks later notifications read, making the unread badge inaccurate.",
    criteria: ["creates and reads an unread notification with the correct badge", "keeps later messages unread when marking through the first message", "marks all earlier messages and the selected middle message read", "makes the badge zero after marking through the newest message", "leaves a later arrival unread after an earlier read action", "rejects blank messages without changing the inbox", "keeps another account from reading or acknowledging messages", "rejects reads and actions without a valid demo session"],
  },
  {
    id: "the-repeating-feed", title: "The Repeating Feed", category: "Stable cursor pagination", shortTag: "cursor pagination", difficulty: "intermediate",
    symptom: "Posts sharing the same timestamp can disappear between pages of a community feed.",
    criteria: ["publishes a post and reads back its exact fields", "returns the newest page in a stable order", "continues through posts sharing the first page boundary time", "walks three pages without repeats or omissions", "handles an earlier-time boundary without repeating the first page", "rejects invalid posts, limits, and cursors without changing the feed", "keeps another account from reading a private feed post", "rejects unauthenticated feed reads and publication"],
  },
  {
    id: "the-task-that-started-too-soon", title: "The Task That Started Too Soon", category: "Dependency readiness", shortTag: "task dependencies", difficulty: "intermediate",
    symptom: "A task can be completed after only one of its required prerequisite tasks is done.",
    criteria: ["creates and reads a task with a pending status", "keeps a task pending when only one of two prerequisites is done", "completes a task after every prerequisite is done", "allows a task with no prerequisites to complete once", "updates dependencies on a pending task and checks the new readiness", "rejects invalid and cyclic dependencies without changing saved tasks", "rejects dependencies from another account and hides foreign tasks", "requires a valid demo session to read and complete a task"],
  },
  {
    id: "the-delivery-that-went-backwards", title: "The Delivery That Went Backwards", category: "Out-of-order event reconciliation", shortTag: "event ordering", difficulty: "intermediate",
    symptom: "Late or retried courier events can move a shipment backward or duplicate its history.",
    criteria: ["creates and reads a shipment with an empty event timeline", "records a signed event and advances the headline stage", "does not move backward when an older stage arrives after a newer stage", "ignores a retry using an event ID already in the timeline", "keeps delivered as the final headline stage despite late events", "rejects malformed and unsigned updates without changing the shipment", "keeps another seller from reading or updating a shipment", "requires a valid demo session for reads and courier updates"],
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
  },
  {
    "id": "the-reopened-loan",
    "title": "The Reopened Loan",
    "category": "Workflow invariants / resource ownership",
    "shortTag": "workflow safety",
    "difficulty": "intermediate",
    "symptom": "An equipment request can appear approved after its borrower has cancelled it. Borrowers have also reported seeing or changing requests that belong to someone else, even though the account switcher shows their own identity.",
    "criteria": [
      "creates a borrower-owned request and reads back its saved fields",
      "cancels a pending owned request and persists cancellation",
      "approves a pending request using the reviewer identity",
      "rejects stale approval of a cancelled request without changing stored state",
      "rejects another borrower's reads and mutations",
      "rejects invalid creation input without inserting records",
      "rejects unauthenticated requests without changing records",
      "rejects borrower attempts to invoke reviewer-only actions"
    ]
  },
  {
    id: "the-split-shipment",
    title: "The Split Shipment",
    category: "Workflow state / partial fulfillment",
    shortTag: "fulfillment state",
    difficulty: "intermediate",
    symptom: "An order can remain partially shipped even after every requested item has been fulfilled across two parcels.",
    criteria: [
      "creates a customer order with its requested quantities and reads it back",
      "records a partial shipment without changing unshipped line quantities",
      "marks an order shipped after two shipments complete every line",
      "rejects shipping more than remains and preserves the saved order",
      "rejects malformed order and shipment quantities without inserting changes",
      "keeps another customer from reading or shipping the order",
      "requires a signed demo session for all order reads and changes",
    ],
  },
  {
    id: "the-shared-draft",
    title: "The Shared Draft",
    category: "Collaborative editing / optimistic concurrency",
    shortTag: "lost updates",
    difficulty: "intermediate",
    symptom: "A stale editor tab can silently overwrite a teammate's newer announcement draft.",
    criteria: [
      "creates a team draft and reads back its first saved revision",
      "lets a teammate save a revision based on the latest version",
      "rejects an older editor view without overwriting the newer saved text",
      "keeps a readable revision sequence after two current-version saves",
      "rejects blank content and missing version without adding a revision",
      "keeps a guest team from reading or editing the editorial draft",
      "requires a signed demo session to read or save a draft",
    ],
  },
  {
    id: "the-quiet-archive",
    title: "The Quiet Archive",
    category: "Soft deletion / read-path consistency",
    shortTag: "archive visibility",
    difficulty: "intermediate",
    symptom: "Archived notes disappear from the active list but remain visible through search and direct links.",
    criteria: [
      "creates a private note and reads back its saved fields",
      "hides an archived note from active list, title search, and direct read",
      "restores an archived note to all active read paths",
      "keeps another editor out of lists, links, and transitions",
      "rejects invalid note and search input without creating a record",
      "requires authentication and leaves notes unchanged after rejected requests",
      "rejects repeated archive or restore while preserving the saved state",
    ],
  },
  {
    id: "the-vanishing-credit",
    title: "The Vanishing Credit",
    category: "Multi-write consistency / account credit",
    shortTag: "credit consistency",
    difficulty: "intermediate",
    symptom: "A declined return can appear in history without crediting the balance, blocking a later eligible return.",
    criteria: [
      "creates an order and reads back its saved fields",
      "credits a successful return exactly once and records its history",
      "rejects a second return for the same order without changing credit",
      "declines an over-limit return without recording it and permits a later eligible return",
      "rejects invalid order and return input without changing records",
      "prevents another customer from reading or returning an order",
      "requires authentication without changing balances or returns",
    ],
  }
];

export function getCatalogEntry(id: string) {
  return challengeCatalog.find((entry) => entry.id === id);
}

// The lab route and the public challenge library must use the same source of
// truth. Keeping route IDs in a second map caused newly published challenges
// to appear in the library but resolve to the global 404 page when opened.
export function labChallengeParams() {
  return challengeCatalog.map((entry) => ({ id: entry.id }));
}

// Same-category challenges first (the closest practice neighbours), then
// catalog order fills the remainder, so every detail page links out to a few
// siblings and no challenge is an orphan for crawlers or readers.
export function relatedChallenges(id: string, count = 3): CatalogEntry[] {
  const self = getCatalogEntry(id);
  if (!self) return [];
  const chosen: CatalogEntry[] = [];
  for (const entry of challengeCatalog) {
    if (chosen.length >= count) break;
    if (entry.id !== id && entry.category === self.category) chosen.push(entry);
  }
  for (const entry of challengeCatalog) {
    if (chosen.length >= count) break;
    if (entry.id !== id && !chosen.includes(entry)) chosen.push(entry);
  }
  return chosen;
}
