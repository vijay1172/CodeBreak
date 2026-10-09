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
  },
  {
    "id": "the-invisible-update",
    "title": "The Invisible Update",
    "category": "State management / API sync",
    "difficulty": "intermediate",
    "problemStatement": "A user edits their profile name and hits Save. The page immediately shows the updated name. But refreshing the page shows the old name — the change never actually saved.",
    "criteria": [
      {
        "id": "tiu-1",
        "title": "updates the stored name through the current profile endpoint"
      },
      {
        "id": "tiu-2",
        "title": "answers the retired profile path with a 404"
      },
      {
        "id": "tiu-3",
        "title": "sends profile saves to the current endpoint"
      },
      {
        "id": "tiu-4",
        "title": "reverts the shown name when a save fails"
      },
      {
        "id": "tiu-5",
        "title": "rejects blank or oversized profile names"
      }
    ],
    "hints": {
      "tier1": "Watch the network traffic while saving. The on-screen name and the stored name disagree — one request never lands where it should.",
      "tier2": "Compare the URL in client/src/api/userApi.js with the routes the server actually mounts, then trace what the save handler in client/src/hooks/useProfile.js does when that request fails.",
      "tier3": "The client still posts to a path that no longer exists, and the rejected promise is only logged while the optimistic name stays on screen. Point the request at the live route and roll the shown name back when the save rejects."
    },
    "debrief": {
      "rootCause": "The save request targeted a retired endpoint, and the optimistic name change was never reverted when that request failed.",
      "realWorldContext": "Renaming an API route silently breaks every client that still calls the old path. Optimistic UI without a rollback turns a visible error into a lie the interface tells until the next refresh.",
      "patternToWatch": "Treat every optimistic update as a loan: confirm it with the server response or pay it back with a rollback, and keep client paths in sync with the routes the server actually mounts."
    },
    "referenceFix": "client/src/api/userApi.js: POST/PUT target moves from /api/profile to /api/user/profile.\nclient/src/hooks/useProfile.js: capture the previous name before the optimistic set and restore it in the catch path (good fix).\nAlternative fix: drop the optimistic set entirely and only call setDisplayName with the saved server response, so a failed save never moves the UI."
  },
  {
    "id": "the-duplicate-order",
    "title": "The Duplicate Order",
    "category": "Request deduplication / idempotency",
    "difficulty": "intermediate",
    "problemStatement": "Clicking the Place Order button quickly two times in a row creates two identical orders and processes payment twice. A single click always works correctly.",
    "criteria": [
      {
        "id": "tdo-1",
        "title": "creates exactly one order for a single submission"
      },
      {
        "id": "tdo-2",
        "title": "returns the existing order when the same operation key is replayed"
      },
      {
        "id": "tdo-3",
        "title": "keeps two identical rapid submissions to a single order"
      },
      {
        "id": "tdo-4",
        "title": "prices the order from the seeded catalogue"
      },
      {
        "id": "tdo-5",
        "title": "rejects an order without purchasable items"
      }
    ],
    "hints": {
      "tier1": "Send the same request twice in a row and count the orders that come back. Then look at what the server does with a request it has already priced.",
      "tier2": "The checkout page and server/controllers/orderController.js both treat every submission as brand new. Nothing records that two requests carried the same intent.",
      "tier3": "Give each submission a stable operation identity (the Idempotency-Key header), store it with the order under a unique index, and return the stored order instead of inserting again when the key repeats."
    },
    "debrief": {
      "rootCause": "Neither the checkout page nor the order route recorded submission identity, so two identical requests both ran the insert path.",
      "realWorldContext": "Double-clicked checkout buttons and flaky mobile connections submit the same order twice in the real world; duplicate charges and shipments are the classic cost.",
      "patternToWatch": "Carry an idempotency key from the first attempt through every repeat, enforce it with a unique index server-side, and answer a replay with the original result."
    },
    "referenceFix": "client/src/pages/CheckoutPage.jsx + hooks/useCheckout.js: disable the submit control while a submission is in flight and send a stable Idempotency-Key header.\nserver/models/Order.js + controllers/orderController.js: store an operationKey with a unique sparse index; a replayed or racing key returns the stored order (200) instead of inserting.\nAlternative fix: skip the header and deduplicate on a sha256 hash of the normalized item lines with the same unique-index treatment."
  },
  {
    "id": "the-leaked-password",
    "title": "The Leaked Password",
    "category": "Sensitive data exposure",
    "difficulty": "beginner",
    "problemStatement": "The user profile page loads correctly and shows the right information. But a security reviewer flagged that something sensitive is being returned from the API that should never reach the frontend.",
    "criteria": [
      {
        "id": "tlp-1",
        "title": "hides the password hash from the profile response"
      },
      {
        "id": "tlp-2",
        "title": "hides the admin flag from the profile response"
      },
      {
        "id": "tlp-3",
        "title": "still returns the public profile fields"
      },
      {
        "id": "tlp-4",
        "title": "never loads the password hash without an explicit request"
      }
    ],
    "hints": {
      "tier1": "Open the profile URL yourself and read the raw JSON body field by field. Compare every key against what the profile card actually renders.",
      "tier2": "server/routes/users.js returns the raw document. Check which sensitive fields the schema in server/models/User.js loads by default.",
      "tier3": "The credential hash should not be loaded from MongoDB at all unless a login flow asks for it — mark it at the schema level — and the admin flag must be stripped before the response leaves the route."
    },
    "debrief": {
      "rootCause": "The profile route serialized the full stored document, credential hash and privilege flag included.",
      "realWorldContext": "Security reviewers regularly fuzz public endpoints for exactly these fields. A leaked credential hash enables offline cracking and an exposed privilege flag invites privilege-escalation attempts.",
      "patternToWatch": "Keep secrets out of query results at the schema level and serialize an explicit whitelist of public fields for every response that leaves the service."
    },
    "referenceFix": "server/models/User.js: passwordHash gains select: false so ordinary queries never load it.\nserver/controllers/userController.js: the profile response becomes an explicit whitelist (id, email, name, memberSince) instead of the raw document.\nAlternative fix: keep the whitelist in a schema toJSON transform (delete passwordHash and isAdmin) and drop .lean() so the transform runs; schema-level select: false is still required."
  },
  {
    "id": "the-frozen-dropdown",
    "title": "The Frozen Dropdown",
    "category": "useEffect dependency array bug",
    "difficulty": "beginner",
    "problemStatement": "The category filter dropdown loads correctly the first time you visit the products page. But navigating to another shop and coming back leaves the dropdown permanently empty or stuck in a loading state.",
    "criteria": [
      {
        "id": "tfd-1",
        "title": "loads the category list for the first shop"
      },
      {
        "id": "tfd-2",
        "title": "reloads categories when the shop changes"
      },
      {
        "id": "tfd-3",
        "title": "resolves the final shop when switches come quickly"
      },
      {
        "id": "tfd-4",
        "title": "serves a distinct catalogue per shop"
      },
      {
        "id": "tfd-5",
        "title": "answers an empty list for a shop without categories"
      }
    ],
    "hints": {
      "tier1": "Switch shops while watching the network tab. The second request never leaves the browser.",
      "tier2": "client/src/hooks/useCategories.js decides when to fetch. Compare its dependency list with the values it reads while loading.",
      "tier3": "The fetch effect declared an empty dependency array, so it captured the first shop forever. Re-run the effect whenever the shop changes — and make sure a slower response for the previous shop cannot overwrite the newer one."
    },
    "debrief": {
      "rootCause": "The category effect declared an empty dependency array, so it fetched once at mount and ignored every later shop change.",
      "realWorldContext": "Filter panels are the classic casualty of stale effect dependencies: the first visit works, and every navigation afterwards silently reuses data that no longer matches the page.",
      "patternToWatch": "Every effect should list the reactive values it reads. When requests can overlap, cancel or ignore the losers so only the latest request wins."
    },
    "referenceFix": "client/src/hooks/useCategories.js: add shopId to the effect dependency array (good fix).\nAlternative fix: keep the dependency array and additionally abort the in-flight request on cleanup, so rapid shop switches can never overwrite the newest list."
  },
  {
    "id": "the-ghost-cart",
    "title": "The Ghost Cart",
    "category": "JWT stale payload",
    "difficulty": "intermediate",
    "problemStatement": "A user upgrades their account to premium. They log out and log back in. The app still shows them the free tier interface and blocks premium features — even though their account is definitely upgraded in the database.",
    "criteria": [
      {
        "id": "tgc-1",
        "title": "issues a login token carrying the stored plan"
      },
      {
        "id": "tgc-2",
        "title": "reflects an upgrade in the next login token"
      },
      {
        "id": "tgc-3",
        "title": "accepts the upgraded token on premium routes"
      },
      {
        "id": "tgc-4",
        "title": "rejects a pre-upgrade token on premium routes"
      },
      {
        "id": "tgc-5",
        "title": "rejects a login for an unknown account"
      }
    ],
    "hints": {
      "tier1": "Upgrade the account, log in again, and paste the new token into a JWT decoder. Compare the plan claim with the database.",
      "tier2": "Follow the login request through server/controllers/authController.js to server/services/userCache.js, then check whether the upgrade route touches that same cache.",
      "tier3": "Login prefers a memoized user object and stamps its plan claim into the token, and the upgrade route never invalidates that memo. Read the plan from the database at login — or forget the cached entry the moment an upgrade commits."
    },
    "debrief": {
      "rootCause": "Login signed tokens from a memoized user object, and the upgrade flow never invalidated that memo, so every later login re-issued the stale plan.",
      "realWorldContext": "Entitlement bugs like this generate support tickets that look like fraud reports: customers paid, the database agrees, and the product still says otherwise until the cache expires.",
      "patternToWatch": "Read authorization claims from the source of truth when tokens are minted, and invalidate every cache that touches identity whenever entitlements change."
    },
    "referenceFix": "server/controllers/authController.js (good fix): read the user fresh from the database at login instead of preferring the memoized copy.\nAlternative fix: keep the cache but call expireUser(email) in the upgrade controller so the next login misses the cache."
  },
  {
    "id": "the-runaway-query",
    "title": "The Runaway Query",
    "category": "Unbounded database fetch",
    "difficulty": "beginner",
    "problemStatement": "The admin users page works perfectly with a small dataset. But when tested with a realistic data volume it becomes extremely slow, unresponsive, or crashes entirely.",
    "criteria": [
      {
        "id": "trq-1",
        "title": "caps the default directory page at fifty users"
      },
      {
        "id": "trq-2",
        "title": "serves the requested page at the requested size"
      },
      {
        "id": "trq-3",
        "title": "includes paging metadata for the table"
      },
      {
        "id": "trq-4",
        "title": "requires the admin key for the directory"
      },
      {
        "id": "trq-5",
        "title": "honors a larger request without lifting the cap"
      }
    ],
    "hints": {
      "tier1": "Seed the directory with a few hundred accounts and watch the response size. Nothing on the page asks for that much data at once.",
      "tier2": "server/controllers/adminController.js builds the directory with a single unbounded query. Compare it with the paging parameters the request already supplies.",
      "tier3": "The route reads the whole member collection and ignores page and limit. Apply skip and limit with a sane default, and return the total count so the table can render pagination."
    },
    "debrief": {
      "rootCause": "The directory route fetched every member document in one query and ignored the paging parameters the request carried.",
      "realWorldContext": "Directories grow quietly for months, and the first realistic dataset turns a page that 'worked' into an outage — unbounded list queries are one of the most common production performance bugs.",
      "patternToWatch": "Never ship a list endpoint without a limit, paging parameters, and a total count, and test it against data volumes bigger than your laptop dataset."
    },
    "referenceFix": "server/controllers/adminController.js (good fix): skip/limit paging with a default of 50 and a ceiling of 100, plus total/page/pages metadata.\nAlternative fix: an aggregation with $facet producing the identical response shape in a single round trip."
  },
  {
    "id": "the-confused-timezone",
    "title": "The Confused Timezone",
    "category": "Date handling / timezone bug",
    "difficulty": "intermediate",
    "problemStatement": "Events show the correct date to the person who created them, but other users in different timezones see the same event listed one day earlier or one day later.",
    "criteria": [
      {
        "id": "tct-1",
        "title": "stores the chosen day as a UTC timestamp"
      },
      {
        "id": "tct-2",
        "title": "renders the same calendar day in every timezone"
      },
      {
        "id": "tct-3",
        "title": "returns the submitted day on read-back"
      },
      {
        "id": "tct-4",
        "title": "rejects impossible calendar days"
      },
      {
        "id": "tct-5",
        "title": "lists events in calendar order"
      }
    ],
    "hints": {
      "tier1": "Create an event, then read the stored document directly. Compare the stored shape with the string the form submitted.",
      "tier2": "server/controllers/eventController.js stores the submitted string as-is, and client/src/utils/dateUtils.js hands that string to Date before applying the viewer's timezone.",
      "tier3": "A date-only string is parsed as midnight UTC, so formatting it in a western timezone shifts it a day back. Validate the calendar day, store a real UTC timestamp for that day, and format calendar dates in UTC — never in the viewer's timezone."
    },
    "debrief": {
      "rootCause": "The event day was stored as a bare string and later parsed as a UTC midnight instant, which viewer timezones then shifted across a day boundary.",
      "realWorldContext": "Concert dates, deadlines, and schedules are calendar days, not instants — the same value renders differently for every city when the code treats them as timestamps.",
      "patternToWatch": "Store calendar days as UTC timestamps (or date-only types), validate them, and format them pinned to UTC; keep true instants and calendar days separate end to end."
    },
    "referenceFix": "server/models/Event.js + controllers/eventController.js (good fix): validate the calendar day and store new Date(date + 'T00:00:00.000Z') as a Date; the serializer returns the date-only string.\nclient/src/utils/dateUtils.js: format with timeZone 'UTC' instead of the viewer's timezone.\nAlternative fix: store noon UTC ('T12:00:00.000Z') — the same day survives any offset — with the same UTC formatting."
  },
  {
    "id": "the-missing-notification",
    "title": "The Missing Notification",
    "category": "Promise.all failure mode / swallowed rejection",
    "difficulty": "intermediate",
    "problemStatement": "When a new order is placed, users should receive a confirmation email and the product inventory should update simultaneously. Sometimes only one happens. Sometimes neither does. The order itself always saves correctly.",
    "criteria": [
      {
        "id": "tmn-1",
        "title": "confirms the order and completes both side effects"
      },
      {
        "id": "tmn-2",
        "title": "fails the request when the inventory update throws"
      },
      {
        "id": "tmn-3",
        "title": "does not confirm the order when the notification fails"
      },
      {
        "id": "tmn-4",
        "title": "decrements stock by the ordered quantity"
      },
      {
        "id": "tmn-5",
        "title": "leaves stock untouched when the inventory update fails"
      }
    ],
    "hints": {
      "tier1": "Force the notification service to fail and place an order. The order still confirms — so where did the failure go?",
      "tier2": "server/services/inventoryService.js wraps its own work in a catch, and server/controllers/orderController.js settles the two side effects without ever looking at the outcomes.",
      "tier3": "One service swallows its own rejection and the controller uses an all-settled style, so no failure can ever reject the batch. Let the services throw and run them with Promise.all so the first failure rejects the request."
    },
    "debrief": {
      "rootCause": "The inventory service caught its own failures, and the controller settled both side effects without inspecting the outcomes — rejections could never reach the response.",
      "realWorldContext": "Order side effects that silently vanish create inventory drift and customers who never learn their payment succeeded — the exact combination that turns small bugs into reconciliations.",
      "patternToWatch": "Let failures propagate from services, run independent work with Promise.all, and decide centrally whether an error means 500, retry, or compensation."
    },
    "referenceFix": "server/services/inventoryService.js: remove the internal catch so failures propagate (good fix).\nserver/controllers/orderController.js: run both side effects with Promise.all inside try/catch, forwarding to next() for a 500.\nAlternative fix: keep Promise.allSettled but inspect each outcome and throw the first failure before responding."
  },
  {
    "id": "the-public-secret",
    "title": "The Public Secret",
    "category": "Environment variable exposure",
    "difficulty": "beginner",
    "problemStatement": "The app works correctly in all environments. But a routine security check found that sensitive backend credentials are visible inside the compiled JavaScript bundle served to the browser.",
    "criteria": [
      {
        "id": "tps-1",
        "title": "keeps the processor secret out of the browser config"
      },
      {
        "id": "tps-2",
        "title": "reads the payment secret from the server environment"
      },
      {
        "id": "tps-3",
        "title": "keeps the database connection string off the client"
      },
      {
        "id": "tps-4",
        "title": "rejects payment intents outside the allowed range"
      },
      {
        "id": "tps-5",
        "title": "stops sourcing browser configuration from import.meta.env"
      }
    ],
    "hints": {
      "tier1": "Open the browser bundle search for the flagged secret value. Then search the repo for where that value is defined.",
      "tier2": "Anything prefixed VITE_ is compiled into the browser bundle by design. Check client/src/config/constants.js and which key the server controller actually reads.",
      "tier3": "The secret was never server configuration at all — it lives in the client constants and the controller reads the wrong variable name. Strip it from the client layer and read STRIPE_SECRET_KEY from the server process environment."
    },
    "debrief": {
      "rootCause": "Backend credentials were configured as VITE_ variables and shipped inside the client constants, while the payment controller read the wrong environment name.",
      "realWorldContext": "Vite and similar build tools deliberately inline VITE_ values into the bundle. Security scanners flag secret keys in shipped JavaScript within minutes, and leaked payment keys are spent in real time.",
      "patternToWatch": "Assume everything in the client folder is public. Secrets live only in server environment variables read at request time, and the client layer carries nothing but public configuration."
    },
    "referenceFix": "client/src/config/constants.js (good fix): export only public configuration; delete the stripe secret, the Mongo URI, and every import.meta.env reference.\nserver/controllers/paymentController.js: read process.env.STRIPE_SECRET_KEY at request time (the buggy controller reads the VITE_-prefixed name).\nAlternative fix: expose the secret through a lazy getter in server/config/env.js and have the controller use that getter — the client-side cleanup is still required."
  },
  {
    "id": "the-slow-search",
    "title": "The Slow Search",
    "category": "Missing index / N+1 query",
    "difficulty": "intermediate",
    "problemStatement": "The product search works correctly and returns accurate results. But every search takes several seconds to respond, even with a relatively small product catalog. Users are abandoning the search before results load.",
    "criteria": [
      {
        "id": "tss-1",
        "title": "indexes the product name for search"
      },
      {
        "id": "tss-2",
        "title": "resolves sellers without one query per result"
      },
      {
        "id": "tss-3",
        "title": "answers a full catalog search quickly"
      },
      {
        "id": "tss-4",
        "title": "matches products by name accurately"
      },
      {
        "id": "tss-5",
        "title": "keeps archived products out of search results"
      }
    ],
    "hints": {
      "tier1": "Time one search, then count the database round trips behind it. The result count and the query count are suspiciously close.",
      "tier2": "server/repositories/productRepository.js fetches matches one way and each seller individually, and the Product schema never declares an index for the field being searched.",
      "tier3": "An unindexed case-insensitive regex scans the whole collection, and one extra findById per hit multiplies the round trips. Declare the index and replace the per-hit lookups with a single populated query."
    },
    "debrief": {
      "rootCause": "Every search scanned the collection without an index and then issued one extra seller query per matching product — an N+1 pattern multiplying round trips with result count.",
      "realWorldContext": "Search is the first page to fall over as a catalogue grows: correctness hides the cost until real data volume turns seconds into timeouts and abandoned carts.",
      "patternToWatch": "Index the fields you filter on, replace per-row lookups with a join or populate, and assert on query counts in tests — wall-clock timings are too flaky to trust."
    },
    "referenceFix": "server/models/Product.js (good fix): declare an index on the name field.\nserver/repositories/productRepository.js: replace the per-product seller lookup with .populate('seller', 'name').\nAlternative fix: keep the index and replace the loop with an aggregation $lookup joining sellers in the same round trip."
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
    testCommand: 'npm test -- --reporter=json --outputFile=/tmp/brokenrepo-results.json',
  }]));
}
