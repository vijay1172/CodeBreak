const accounts = [
  { id: 'maya', name: 'Maya', role: 'Borrower' },
  { id: 'noah', name: 'Noah', role: 'Borrower' },
  { id: 'riley', name: 'Riley', role: 'Reviewer' },
];

export function AccountSwitcher({ current, onChange }) {
  return <div className="account-switcher" aria-label="Demo account">
    <span>Viewing as</span>
    <div className="account-options">{accounts.map((account) => <button key={account.id} type="button" aria-pressed={current === account.id} onClick={() => onChange(account.id)}>
      <strong>{account.name}</strong><small>{account.role}</small>
    </button>)}</div>
  </div>;
}
