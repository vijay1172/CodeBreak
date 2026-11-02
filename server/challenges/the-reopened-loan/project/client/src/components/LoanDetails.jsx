export function LoanDetails({ loan, role, onRefresh, onCancel, onApprove, busy }) {
  return <section className="loan-details" aria-label="Selected request details">
    <div className="section-heading"><div><h2>Request details</h2><p>A request can change while this screen is open.</p></div>{loan && <button type="button" onClick={onRefresh} disabled={busy}>Refresh details</button>}</div>
    {!loan ? <p className="empty">Choose a request from the list.</p> : <div className="details-body">
      <div className="details-title"><strong>{loan.itemName}</strong><em className={`status status-${loan.status}`}>{loan.status}</em></div>
      <dl><div><dt>Borrower</dt><dd>{loan.borrower.name}</dd></div><div><dt>Purpose</dt><dd>{loan.purpose}</dd></div><div><dt>Submitted</dt><dd>{new Date(loan.createdAt).toLocaleString()}</dd></div></dl>
      {loan.status === 'pending' && <div className="detail-actions">
        {role === 'borrower' && <button type="button" className="danger" disabled={busy} onClick={onCancel}>Cancel request</button>}
        {role === 'reviewer' && <button type="button" className="primary" disabled={busy} onClick={onApprove}>Approve request</button>}
      </div>}
    </div>}
  </section>;
}
