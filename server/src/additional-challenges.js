import path from 'node:path';
import { config } from './config.js';
const specifications = [
  {
    "id": "the-penny-gap",
    "title": "The Penny Gap",
    "category": "Currency / numeric precision",
    "difficulty": "beginner",
    "problemStatement": "A shop’s invoice preview is occasionally a few cents lower than the prices on its product cards. Increasing the quantity makes the difference grow. Other products total correctly, and the same discrepancy appears in saved invoices.",
    "criteria": [
      {
        "id": "whole-prices",
        "title": "quotes whole-dollar products correctly"
      },
      {
        "id": "decimal-prices",
        "title": "preserves every cent across fractional prices and quantities"
      },
      {
        "id": "invoice-snapshot",
        "title": "stores the invoice amount returned to the customer"
      },
      {
        "id": "quantity-validation",
        "title": "rejects invalid quantities without creating invoices"
      },
      {
        "id": "unknown-product",
        "title": "returns a clear error for an unavailable product"
      }
    ],
    "hints": {
      "tier1": "Follow a displayed product price through the preview and into the saved invoice. Find where its representation changes.",
      "tier2": "Compare the decimal-string price in Product with the value produced by server/services/money.js before line quantities are applied.",
      "tier3": "Multiplying a binary floating-point number by 100 can land just below an integer. Truncating that result loses a cent; conversion must respect the two-decimal input contract."
    },
    "debrief": {
      "rootCause": "The money converter truncated a floating-point multiplication. Values such as 0.29 can become 28.999… before conversion to cents.",
      "realWorldContext": "A one-cent conversion error compounds with quantities and becomes a reconciliation problem when previews, charges, and ledgers disagree.",
      "patternToWatch": "Keep currency in integer minor units or exact decimals, define a rounding policy, and test decimal boundaries rather than only whole prices."
    }
  },
  {
    "id": "a-day-too-early",
    "title": "A Day Too Early",
    "category": "Date-only / timezone semantics",
    "difficulty": "intermediate",
    "problemStatement": "A student schedules an assignment for March 12, but classmates in some locations see March 11 on the course calendar. The edit form still shows the date the student chose, and not everyone can reproduce the problem.",
    "criteria": [
      {
        "id": "date-storage",
        "title": "stores the chosen calendar date without changing it"
      },
      {
        "id": "date-display",
        "title": "shows the same calendar day for viewers in different timezones"
      },
      {
        "id": "date-order",
        "title": "lists assignments in calendar order"
      },
      {
        "id": "invalid-date",
        "title": "rejects impossible calendar dates"
      },
      {
        "id": "missing-assignment",
        "title": "returns 404 for an assignment that does not exist"
      }
    ],
    "hints": {
      "tier1": "Compare the date in the edit form and network response with the date on the calendar card. Does this value represent a moment or just a day?",
      "tier2": "The model stores a date-only string. Trace how client/src/formatters/calendarDate.js turns that string into the card label.",
      "tier3": "A date-only ISO string is interpreted as midnight UTC by Date. Formatting that instant in a western timezone moves it to the previous day. Preserve date-only semantics instead of treating the value as a viewer-local instant."
    },
    "debrief": {
      "rootCause": "The display layer converted a date-only value into a UTC instant, then applied the viewer's timezone. Calendar days and timestamps were treated as interchangeable.",
      "realWorldContext": "Due dates, birthdays, holidays, and travel dates often must remain the same named day worldwide. A timezone conversion appropriate for a meeting timestamp is wrong for these values.",
      "patternToWatch": "Model plain dates separately from instants and test western/eastern timezones, leap days, and year boundaries."
    }
  },
  {
    "id": "the-split-import",
    "title": "The Split Import",
    "category": "File import / CSV parsing",
    "difficulty": "intermediate",
    "problemStatement": "The supplier directory imports small spreadsheets correctly, but some larger exports are rejected even though they open normally in a spreadsheet app. Retrying the same file does not help. The team needs every contact and its notes preserved, not skipped.",
    "criteria": [
      {
        "id": "ordinary-csv",
        "title": "imports ordinary contacts and quoted commas"
      },
      {
        "id": "multiline-csv",
        "title": "preserves complete records containing multiline quoted notes"
      },
      {
        "id": "repeat-import",
        "title": "updates existing contacts without duplicating them"
      },
      {
        "id": "invalid-import",
        "title": "rejects invalid rows before writing any contacts"
      },
      {
        "id": "empty-import",
        "title": "rejects an empty upload with a useful message"
      }
    ],
    "hints": {
      "tier1": "Compare one accepted export and one rejected export. A spreadsheet row can contain more than one physical line of text.",
      "tier2": "Follow the multipart upload through importContacts into server/services/readCsvRows.js. Check what is passed to the CSV parser.",
      "tier3": "The wrapper splits the document into physical lines before parsing. That discards the quote context needed to recognize line breaks inside a field. Parse while retaining document-level state."
    },
    "debrief": {
      "rootCause": "A line-by-line wrapper reset the CSV parser's quote state for every physical line, so valid multiline fields were mistaken for broken records.",
      "realWorldContext": "Spreadsheet exports commonly contain addresses and notes with commas, escaped quotes, and embedded newlines. Silent row skipping can corrupt imports without users noticing.",
      "patternToWatch": "Use a document-aware or streaming parser, validate the complete import before writing, and test real multipart files with multiline fields and escaped quotes."
    }
  },
  {
    "id": "the-room-that-wont-leave",
    "title": "The Room That Won’t Leave",
    "category": "Resource lifecycle / listener cleanup",
    "difficulty": "intermediate",
    "problemStatement": "The team room works normally when first opened. After users visit other screens and return a few times, each teammate update produces several notifications. People also receive room notifications after they have left the room.",
    "criteria": [
      {
        "id": "member-directory",
        "title": "loads the member directory from the API"
      },
      {
        "id": "status-update",
        "title": "persists a member status change"
      },
      {
        "id": "invalid-status",
        "title": "rejects unsupported presence states"
      },
      {
        "id": "live-delivery",
        "title": "delivers each valid presence event to an active screen"
      },
      {
        "id": "subscription-lifecycle",
        "title": "stops delivery after unmount and avoids duplicate subscriptions on return"
      }
    ],
    "hints": {
      "tier1": "Check whether the notifications come from duplicate server records or from multiple handlers reacting to one incoming event.",
      "tier2": "Follow the cleanup returned by usePresenceFeed into client/src/realtime/subscribePresence.js. Compare the listener being registered with the one being removed.",
      "tier3": "Event listeners are removed by callback identity. A wrapper function and the function it calls are different listeners. Cleanup must release the exact registration or its owning signal."
    },
    "debrief": {
      "rootCause": "The subscription registered an anonymous wrapper but tried to remove its inner decoder. The old wrapper remained attached after the React screen unmounted.",
      "realWorldContext": "Leaked listeners retain closures and keep producing side effects after navigation. Repeated visits multiply notifications and can eventually increase memory and CPU usage.",
      "patternToWatch": "Treat every subscription as an owned resource with a matching disposer. Test repeated mount/unmount cycles, not just the first successful event."
    }
  },
  {
    "id": "the-borrowed-language",
    "title": "The Borrowed Language",
    "category": "Caching / incomplete cache key",
    "difficulty": "intermediate",
    "problemStatement": "Shoppers switch the catalogue from English to French, but some product pages keep the English title and description. A different product may appear in the correct language. The problem also seems to depend on which language was used first after the service restarted.",
    "criteria": [
      {
        "id": "localized-product",
        "title": "returns the requested translation on a cold lookup"
      },
      {
        "id": "cache-reuse",
        "title": "reuses cached data for repeated equivalent requests"
      },
      {
        "id": "locale-isolation",
        "title": "keeps product translations independent across warmed cache entries"
      },
      {
        "id": "locale-validation",
        "title": "rejects unsupported locales"
      },
      {
        "id": "missing-product",
        "title": "returns 404 rather than caching a missing product"
      }
    ],
    "hints": {
      "tier1": "Compare a product's first request after startup with later requests. What changes between two requests that should produce different text?",
      "tier2": "The translation records are present in MongoDB. Trace the arguments through catalogueController and server/services/productCatalogue.js, then inspect the cache identity.",
      "tier3": "The service caches an already-localized response using only the product identifier. Either every response-varying input must be part of that identity, or the cached value must remain locale-independent until serialization."
    },
    "debrief": {
      "rootCause": "The cache stored localized product responses under a key containing only the SKU. A response computed for one language was reused for other languages.",
      "realWorldContext": "Caching a derived response without all of its varying dimensions can mix locales, currencies, permission scopes, or customer-specific content.",
      "patternToWatch": "Document what each cached value represents. Include all relevant dimensions in its key, or cache neutral source data and derive the response afterward."
    }
  },
  {
    "id": "the-search-that-guesses",
    "title": "The Search That Guesses",
    "category": "Search / literal query handling",
    "difficulty": "beginner",
    "problemStatement": "The internal library search works for ordinary words, but searching for exact tool names such as “Node.js” returns unrelated titles. Some names containing punctuation do not produce results at all. Users expect the search box to find the text they typed.",
    "criteria": [
      {
        "id": "word-search",
        "title": "finds ordinary words without case sensitivity"
      },
      {
        "id": "literal-search",
        "title": "treats punctuation in search text as literal characters"
      },
      {
        "id": "archived-items",
        "title": "excludes archived library entries"
      },
      {
        "id": "empty-search",
        "title": "returns a stable default list for an empty query"
      },
      {
        "id": "query-length",
        "title": "rejects overlong search input"
      }
    ],
    "hints": {
      "tier1": "Compare the unexpected matches with the characters the user typed. Do punctuation characters behave like ordinary text?",
      "tier2": "Trace the search field through the controller into server/repositories/library.js. Inspect the database condition built from q.",
      "tier3": "User input is being interpreted as a regular expression. The product promises literal substring search, so the query must not give punctuation special pattern-matching meaning."
    },
    "debrief": {
      "rootCause": "The repository inserted the user's text directly into a regular expression instead of preserving literal substring semantics.",
      "realWorldContext": "Tool names, filenames, identifiers, and codes often contain punctuation. Treating them as patterns produces false matches, syntax errors, and potentially expensive database searches.",
      "patternToWatch": "Specify whether a search accepts literals or a query language. Keep user data separate from executable query syntax, bound inputs, and test punctuation and near-miss records."
    }
  },
  {
    "id": "one-click-two-bookings",
    "title": "One Click, Two Bookings",
    "category": "Retry semantics / idempotency",
    "difficulty": "intermediate",
    "problemStatement": "A workshop booking sometimes appears twice after a brief connection interruption. The attendee clicked once and saw one confirmation. Normal bookings work, and refreshing the bookings list confirms that both entries were saved.",
    "criteria": [
      {
        "id": "normal-booking",
        "title": "creates and confirms a normal workshop booking"
      },
      {
        "id": "server-replay",
        "title": "replays an existing operation without inserting another booking"
      },
      {
        "id": "lost-response",
        "title": "creates one booking when a committed response is lost and retried"
      },
      {
        "id": "separate-operations",
        "title": "keeps independently submitted bookings distinct"
      },
      {
        "id": "invalid-booking",
        "title": "does not retry a rejected booking request"
      }
    ],
    "hints": {
      "tier1": "A failed response does not always mean the server failed to save the booking. Follow one logical submission through both network attempts.",
      "tier2": "The server already recognizes repeated operation keys. Compare what client/src/api/createRegistration.js passes to prepareRegistration on each retry.",
      "tier3": "The client creates a new operation identity inside the retry loop. A retry of the same intent needs the same identity; a separate user submission needs a new one."
    },
    "debrief": {
      "rootCause": "Each transport retry generated a fresh idempotency key. When the first request committed but its response was lost, the second key made the server treat the retry as a new booking.",
      "realWorldContext": "Connection resets can happen after a payment, booking, or job has already been committed. Blind retries of side-effecting requests can duplicate real work even when the user acts only once.",
      "patternToWatch": "Separate a logical operation from its transport attempts. Keep its idempotency identity stable across retries, enforce uniqueness server-side, and test a response lost after commit."
    }
  }
];
export function additionalChallenges(validationCommand) {
  return Object.fromEntries(specifications.map(specification => [specification.id, {
    ...specification,
    stack: 'MERN',
    projectDirectory: path.join(config.projectRoot, 'challenges', specification.id, 'project'),
    discoverEditablePaths: true,
    requiresMongo: true,
    editablePaths: [],
    hiddenPaths: ['vitest.config.js', 'package-lock.json'],
    installCommand: 'npm install --no-audit --no-fund',
    startCommand: 'npm run start:challenge',
    validationCommand,
    testCommand: 'npm test -- --reporter=json --outputFile=/tmp/codebreak-results.json',
  }]));
}
