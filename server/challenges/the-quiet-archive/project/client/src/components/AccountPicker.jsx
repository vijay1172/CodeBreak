export function AccountPicker({ account, onChange }) {
  return <label>Demo editor <select value={account} onChange={(event) => onChange(event.target.value)}><option value="ava">Ava</option><option value="ben">Ben</option></select></label>;
}
