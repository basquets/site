export interface SegmentedOption {
  value: string;
  label: string;
}

/** Flat Modernist segmented control: bordered row, selected cell inverts to ink. */
export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <fieldset className="m-0 inline-flex flex-wrap border border-divider p-0">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={
            o.value === value
              ? "cursor-pointer bg-ink px-3 py-1.5 font-heading font-extrabold text-ground text-sm"
              : "cursor-pointer px-3 py-1.5 text-ink text-sm hover:bg-surface active:bg-ink/10"
          }
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  );
}
