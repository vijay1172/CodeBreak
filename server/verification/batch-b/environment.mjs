// Verification children need local tools and the isolated Mongo binary, never
// platform credentials loaded by the orchestrator's server configuration.
export function verificationEnvironment(environment = process.env) {
  const standard = new Set(["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "LC_CTYPE", "TZ", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT"]);
  return Object.fromEntries(Object.entries(environment).filter(([key]) => standard.has(key) || /^MONGOMS_[A-Z_]+$/.test(key)));
}
