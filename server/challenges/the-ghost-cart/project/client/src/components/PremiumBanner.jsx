export function PremiumBanner({ isPremium }) {
  return isPremium ? <p role='status'>Premium features unlocked.</p> : <p>Upgrade to unlock premium features.</p>;
}