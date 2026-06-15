import { Input } from "./Input";
import { Select } from "./Select";

export type FieldControlType = "text" | "number" | "date" | "select";

export function Field({
  label,
  type,
  value,
  onChange,
  options,
  helpText,
  optional,
  id,
}: {
  label: string;
  type: FieldControlType;
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  helpText?: string;
  optional?: boolean;
  id?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 font-mono text-xs uppercase tracking-wide text-subtle"
      >
        {label}
        {optional ? <span className="normal-case">optional</span> : null}
      </label>
      {type === "select" ? (
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {(options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      ) : (
        // Kept as free text: the agent returns natural strings ("March 3, 1990",
        // "1800") that native date/number inputs would reject.
        <Input
          id={id}
          type="text"
          inputMode={type === "number" ? "numeric" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {helpText ? <p className="text-xs text-subtle">{helpText}</p> : null}
    </div>
  );
}
