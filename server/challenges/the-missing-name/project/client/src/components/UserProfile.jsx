export function profileViewModel(user) {
  return { displayName: user.name };
}

export function UserProfile({ user }) {
  const profile = profileViewModel(user);
  return <section aria-label="User profile"><h2>{profile.displayName}</h2></section>;
}
