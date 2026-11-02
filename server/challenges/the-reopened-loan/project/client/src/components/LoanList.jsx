export function LoanList({ loans, selectedId, onSelect, onRefresh, loading }) {
  return <section className="loan-list" aria-label="Equipment requests">
    <div className="section-heading"><div><h2>Requests</h2><p>Select one to view its current details.</p></div><button type="button" onClick={onRefresh} disabled={loading}>Refresh requests</button></div>
    {loans.length === 0 ? <p className="empty">No requests are visible to this account yet.</p> : <ul>{loans.map((loan) => <li key={loan.id}>
      <button type="button" className={selectedId === loan.id ? 'selected request-row' : 'request-row'} onClick={() => onSelect(loan.id)}>
        <span><strong>{loan.itemName}</strong><small>{loan.borrower.name} · {loan.purpose}</small></span><em className={`status status-${loan.status}`}>{loan.status}</em>
      </button>
    </li>)}</ul>}
  </section>;
}
