const RESERVED_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "invalid.com",
  "localhost",
]);

const DISPOSABLE_DOMAIN_FRAGMENTS = [
  "10minutemail",
  "dispostable",
  "guerrillamail",
  "mailinator",
  "maildrop",
  "sharklasers",
  "tempmail",
  "throwawaymail",
  "yopmail",
];

const SYNTHETIC_LOCAL_PART = /(^|[._+-])(test(?:er|ing|user)?|xyz|dummy|fake|sample|example|demo|temp(?:orary)?|asdf|qwerty|noreply|no-reply)(?:[._+\d-]|$)/i;
const SYNTHETIC_PREFIX = /^(test(?:er|ing|user)?|xyz|dummy|fake|sample|example|demo|temp(?:orary)?|asdf|qwerty)\d*$/i;

export function isLikelyGenuineEmail(email) {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0 || separator === normalized.length - 1) return false;
  const local = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  if (RESERVED_DOMAINS.has(domain)) return false;
  if (DISPOSABLE_DOMAIN_FRAGMENTS.some((fragment) => domain.includes(fragment))) return false;
  if (SYNTHETIC_LOCAL_PART.test(local) || SYNTHETIC_PREFIX.test(local)) return false;
  return true;
}

export function selectAnnouncementAudience(users, engagedUserIds, limit) {
  return users
    .filter((user) => isLikelyGenuineEmail(user.email))
    .sort((left, right) => {
      const engagementDifference = Number(engagedUserIds.has(right._id)) - Number(engagedUserIds.has(left._id));
      if (engagementDifference) return engagementDifference;
      const dateDifference = new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      if (dateDifference) return dateDifference;
      return String(left._id).localeCompare(String(right._id));
    })
    .slice(0, limit);
}
