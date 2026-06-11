import './ContinueCreatingCheckbox.css';

export interface ContinueCreatingCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ContinueCreatingCheckbox({
  checked,
  onChange,
  disabled = false,
}: ContinueCreatingCheckboxProps) {
  return (
    <label className="cb-continue-creating">
      <input
        type="checkbox"
        className="cb-continue-creating__input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="cb-continue-creating__label">Continue creating</span>
    </label>
  );
}
