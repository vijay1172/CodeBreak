export function LocalePicker({ locale, onChange }) {
  return <label>Language<select value={locale} onChange={event => onChange(event.target.value)}><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select></label>;
}
