import path from 'node:path';
import { config } from './config.js';

const specifications = [
  { id: 'the-travelling-form', title: 'The Travelling Form', category: 'Stateful form identity', difficulty: 'intermediate', problemStatement: 'Expense descriptions can become attached to the wrong rows when a draft report is rearranged before submission.', criteria: ['creates a report whose saved rows and total match the submitted form', 'keeps each expense intact when rows are reordered', 'preserves existing rows when one is removed and a new row is added', 'saves edited descriptions and amounts together', 'submits the final report and rejects later edits', 'rejects invalid rows without changing the saved report', 'keeps another demo account from listing, reading, or updating the report', 'rejects reads and writes without a valid demo session'] },
  { id: 'the-disappearing-preferences', title: 'The Disappearing Preferences', category: 'Partial update semantics', difficulty: 'intermediate', problemStatement: 'Saving one career-alert preference can make another choice disappear, and clearing a profile link does not always stick.', criteria: ['opens a preference profile with defaults that survive a fresh read', 'changes one notification without removing the others', 'keeps an earlier false choice through a second partial update', 'sets a website without changing notification choices', 'clears a website explicitly while keeping existing notification choices', 'rejects invalid settings without changing what is saved', 'keeps another demo account from reading or modifying preferences', 'rejects unauthenticated reads and writes'] },
  { id: 'the-coupon-that-wouldnt-leave', title: "The Coupon That Wouldn't Leave", category: 'Derived price state', difficulty: 'intermediate', problemStatement: 'A shop coupon can remain in the checkout total after the eligible products are removed or changed.', criteria: ['creates and reads back a cart with server-calculated totals', 'applies a coupon only to eligible products', 'removes a discount when the last eligible item leaves the cart', 'recalculates the discount when an eligible quantity changes', 'removes an applied coupon and checks out at the undiscounted total', 'rejects invalid items and coupons without changing the cart', 'keeps another demo account from reading or changing the cart', 'requires a valid demo session for reads and writes'] },
  { id: 'the-receipt-that-changed', title: 'The Receipt That Changed', category: 'Historical snapshot integrity', difficulty: 'intermediate', problemStatement: 'An old order receipt changes when the product catalogue or saved address is edited later.', criteria: ['creates and reads a receipt with the checkout-time purchase details', 'keeps the original receipt when the catalogue price changes', 'keeps the original product name after a catalogue rename', 'keeps the original shipping line after the address book changes', 'uses current source details for a new order without rewriting an older order', 'rejects invalid orders and source edits without modifying a receipt', 'keeps another demo account from reading or changing an order', 'rejects reads and writes without a valid demo session'] },
  { id: 'the-cart-that-forgot-you', title: 'The Cart That Forgot You', category: 'Cart reconciliation', difficulty: 'intermediate', problemStatement: 'A guest cart merge can combine different product variants or add the same guest cart twice.', criteria: ['creates a guest cart whose claim code and items survive a fresh read', 'keeps red and blue variants separate when a guest cart is merged', 'combines matching variants without exceeding stock', 'leaves a customer cart unchanged when the same guest cart is merged again', 'merges an empty guest cart without losing customer items', 'rejects invalid variants and claim codes without changing a cart', 'keeps another customer from reading or changing an account cart', 'rejects cart reads and merges without a valid demo session'] },
  { id: 'the-reset-link-that-still-works', title: 'The Reset Link That Still Works', category: 'Single-use credential lifecycle', difficulty: 'intermediate', problemStatement: 'A password-reset link can still change account state after it was used or replaced.', criteria: ['creates a recovery request whose current token survives a fresh read', 'redeems a valid link and records a single password change', 'rejects a second use of an already redeemed link', 'retires an older link when a replacement is issued', 'lets the replacement link work exactly once', 'rejects a weak password without consuming a valid link', 'keeps another account from reading or redeeming a request', 'requires a valid demo session to read or redeem a link'] },
  { id: 'the-inbox-that-reads-ahead', title: 'The Inbox That Reads Ahead', category: 'Bounded state transition', difficulty: 'intermediate', problemStatement: 'Acknowledging an older notification also marks later notifications read, making the unread badge inaccurate.', criteria: ['creates and reads an unread notification with the correct badge', 'keeps later messages unread when marking through the first message', 'marks all earlier messages and the selected middle message read', 'makes the badge zero after marking through the newest message', 'leaves a later arrival unread after an earlier read action', 'rejects blank messages without changing the inbox', 'keeps another account from reading or acknowledging messages', 'rejects reads and actions without a valid demo session'] },
  { id: 'the-repeating-feed', title: 'The Repeating Feed', category: 'Stable cursor pagination', difficulty: 'intermediate', problemStatement: 'Posts sharing the same timestamp can disappear between pages of a community feed.', criteria: ['publishes a post and reads back its exact fields', 'returns the newest page in a stable order', 'continues through posts sharing the first page boundary time', 'walks three pages without repeats or omissions', 'handles an earlier-time boundary without repeating the first page', 'rejects invalid posts, limits, and cursors without changing the feed', 'keeps another account from reading a private feed post', 'rejects unauthenticated feed reads and publication'] },
  { id: 'the-task-that-started-too-soon', title: 'The Task That Started Too Soon', category: 'Dependency readiness', difficulty: 'intermediate', problemStatement: 'A task can be completed after only one of its required prerequisite tasks is done.', criteria: ['creates and reads a task with a pending status', 'keeps a task pending when only one of two prerequisites is done', 'completes a task after every prerequisite is done', 'allows a task with no prerequisites to complete once', 'updates dependencies on a pending task and checks the new readiness', 'rejects invalid and cyclic dependencies without changing saved tasks', 'rejects dependencies from another account and hides foreign tasks', 'requires a valid demo session to read and complete a task'] },
  { id: 'the-delivery-that-went-backwards', title: 'The Delivery That Went Backwards', category: 'Out-of-order event reconciliation', difficulty: 'intermediate', problemStatement: 'Late or retried courier events can move a shipment backward or duplicate its history.', criteria: ['creates and reads a shipment with an empty event timeline', 'records a signed event and advances the headline stage', 'does not move backward when an older stage arrives after a newer stage', 'ignores a retry using an event ID already in the timeline', 'keeps delivered as the final headline stage despite late events', 'rejects malformed and unsigned updates without changing the shipment', 'keeps another seller from reading or updating a shipment', 'requires a valid demo session for reads and courier updates'] },
];

export const nextTenIds = specifications.map(specification => specification.id);

const guidance = {
  'the-travelling-form': {
    hints: ['Reorder two rows and compare each row before and after a fresh read.', 'Check whether row identity remains stable when the array position changes.', 'A save must preserve each submitted row ID, description, and amount as one unit.'],
    rootCause: 'The save path retained descriptions by their previous array position instead of using the description submitted with each stable row ID.',
    context: 'Dynamic forms often reorder or remove fields; positional assumptions can silently attach one person’s data to another item.',
  },
  'the-disappearing-preferences': {
    hints: ['Change a single notification and inspect all choices after reloading.', 'Compare omitted properties with explicit false and null values in the request.', 'Partial updates should merge nested choices and honour an explicit clear value.'],
    rootCause: 'The update path replaced the notification object and skipped a website clear because it treated null as an absent change.',
    context: 'Profile settings commonly use PATCH semantics, where omission, false, and null represent different user intentions.',
  },
  'the-coupon-that-wouldnt-leave': {
    hints: ['Apply the coupon, then change only the eligible items and inspect all four money fields.', 'Compare the checkout total with a fresh calculation from current items and coupon.', 'Every cart mutation should recalculate subtotal, eligible subtotal, discount, and total together.'],
    rootCause: 'Item updates recalculated the subtotal but kept the old discount amount, so checkout used stale derived state.',
    context: 'Checkout amounts must reflect the current cart rather than a discount snapshot from an earlier basket.',
  },
  'the-receipt-that-changed': {
    hints: ['Compare an order before and after changing the linked product or address.', 'Which values are live account data, and which represent a completed purchase?', 'A historical receipt should read the purchase-time snapshot while new orders use current source details.'],
    rootCause: 'Receipt serialization looked up the current product and address instead of returning the stored checkout snapshot.',
    context: 'Orders, invoices, and tax records need durable purchase facts even when product listings or account addresses change.',
  },
  'the-cart-that-forgot-you': {
    hints: ['Merge the same guest cart twice and compare quantities and variant labels.', 'Think about the identity of a cart line and the identity of a merge operation.', 'A merge must match both SKU and variant, respect stock, and remember a claimed guest cart.'],
    rootCause: 'The merge matched only by SKU and did not recognize a guest cart that had already been merged.',
    context: 'Guest-to-account transitions must reconcile state without collapsing distinct variants or replaying the same input.',
  },
  'the-reset-link-that-still-works': {
    hints: ['Use a link once, replace it, and try both the old and new token.', 'Map the valid, replaced, rejected, and used states of one request.', 'Only the current unused link should be redeemable; invalid password input must leave it available.'],
    rootCause: 'Earlier tokens remained in an accepted-token list and successful redemption never marked the request used.',
    context: 'Recovery tokens are credentials. Their lifecycle and replacement semantics matter as much as token randomness.',
  },
  'the-inbox-that-reads-ahead': {
    hints: ['Create three messages and acknowledge only the first; inspect later messages and the badge.', 'A read-through action has a boundary chosen by the user.', 'Keep the update within that boundary and recompute the unread count from saved state.'],
    rootCause: 'The acknowledgement update selected every unread message for the account instead of stopping at the chosen sequence.',
    context: 'Bulk state transitions need a precise boundary or they can silently affect items a user never saw.',
  },
  'the-repeating-feed': {
    hints: ['Publish several posts at exactly the same time and page through them.', 'Check what the cursor says about posts tied at its timestamp.', 'A stable cursor needs both the primary sort value and its tie-breaker.'],
    rootCause: 'The next-page query used only a strict timestamp comparison, dropping other posts tied at the boundary time.',
    context: 'Timestamp collisions are normal at scale; cursor pagination needs a total, stable ordering to prevent missing records.',
  },
  'the-task-that-started-too-soon': {
    hints: ['Create a task with two prerequisites and complete only one.', 'Compare the readiness rule in the brief with the set of saved dependencies.', 'Readiness requires every dependency to be present and complete, not just one.'],
    rootCause: 'The completion check accepted any completed prerequisite rather than requiring all prerequisites to be done.',
    context: 'Workflow engines and project boards must enforce all prerequisites before advancing dependent work.',
  },
  'the-delivery-that-went-backwards': {
    hints: ['Send a newer stage first, then an older stage, and retry one event ID.', 'Separate the complete event history from the current headline stage.', 'A valid unique event can enter history without lowering the furthest stage already reached.'],
    rootCause: 'Each accepted event overwrote the headline stage and entered history, regardless of progression or duplicate event ID.',
    context: 'Webhook senders retry and networks reorder deliveries; consumers must reconcile signed events idempotently.',
  },
};

export function nextTenChallenges(validationCommand) {
  return Object.fromEntries(specifications.map(specification => [specification.id, {
    ...specification,
    stack: 'MERN',
    criteria: specification.criteria.map((title, index) => ({ id: `scenario-${index + 1}`, title })),
    hints: { tier1: guidance[specification.id].hints[0], tier2: guidance[specification.id].hints[1], tier3: guidance[specification.id].hints[2] },
    debrief: { rootCause: guidance[specification.id].rootCause, realWorldContext: guidance[specification.id].context, patternToWatch: 'Test the full action sequence through HTTP, including fresh reads, invalid input, retries, and account boundaries.' },
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
