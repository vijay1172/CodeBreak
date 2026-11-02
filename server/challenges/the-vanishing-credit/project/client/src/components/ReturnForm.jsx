export function ReturnForm({ reason, setReason, submitReturn, disabled }) {
  return <form onSubmit={submitReturn}><label>Return reason<input value={reason} onChange={(event) => setReason(event.target.value)} required/></label><button disabled={disabled}>Return for credit</button></form>;
}
