export default function SummaryBar({ label, value }) {
  const percentage = value ? Math.min((value / 5) * 100, 100) : 0;

  return (
    <div className="summary-bar">
      <div className="summary-bar-header">
        <span>{label}</span>
        <strong>{value ? value.toFixed(2) : "N/A"}</strong>
      </div>
      <div className="summary-bar-track" aria-hidden="true">
        <div className="summary-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

