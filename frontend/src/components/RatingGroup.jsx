export default function RatingGroup({ name, label, options, value, onChange }) {
  return (
    <fieldset className="rating-group">
      <legend>{label}</legend>
      <div className="rating-options">
        {options.map((option) => (
          <label key={option} className={`chip ${value === option ? "chip-active" : ""}`}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

