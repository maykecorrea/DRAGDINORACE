import { useEffect, useRef, useState } from "react";

export function MenuPick<T extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const current = options.find((item) => item.value === value);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <span className={`gf-pick${open ? " is-open" : ""}`} ref={box}>
      <button type="button" aria-label={label} aria-expanded={open} disabled={disabled} onClick={() => setOpen((on) => !on)}>
        {current?.label ?? "—"}
      </button>
      {open && (
        <span className="gf-pick-menu" role="listbox" aria-label={label}>
          {options.map((item) => (
            <button
              key={String(item.value)}
              type="button"
              role="option"
              aria-selected={item.value === value}
              className={item.value === value ? "is-go" : undefined}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
