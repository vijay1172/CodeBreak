export function AccountPicker({ account, onChange }) {
  return <label>Customer <select value={account} onChange={(event) => onChange(event.target.value)}><option value="lena">Lena</option><option value="omar">Omar</option></select></label>;
}
